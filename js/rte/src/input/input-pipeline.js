import {htmlModel} from '../model/html/html-model.js';
import {narrow} from '../command/edit.js';
import {activatingAround} from '../browser/interactive.js';
import {Normalizer} from '../normalize/normalizer/normalizer.js';
import {PointMap} from '../selection/map/point-map.js';
import {EditRange} from '../selection/range/edit-range.js';
import {editingHost, isPlainTextHost} from '../selection/ownership/ownership.js';
import {Point} from '../selection/point/point.js';
import {SelectionSnapshot} from '../selection/snapshot.js';
import {defaultUnstyle} from '../unstyle/unstyle.js';
import {policyFor, sanitizePolicy} from '../sanitize/policy.js';

const TRIGGERS = new Set(['input', 'paste', 'drop', 'command']);
const PASTE = new Set(['insertFromPaste', 'insertFromPasteAsQuotation']);
// An element a strict import list does not carry, but whose meaning a listed one
// does. Dropping `<b>` would lose the emphasis; `<strong>` keeps it, and the
// bold mark already treats the two as the same thing.
export const importAliases = Object.freeze({b: 'strong', i: 'em', strike: 's'});

const DELETE_KEYS = new Map([
    ['Backspace', 'deleteContentBackward'],
    ['Delete', 'deleteContentForward'],
]);

export class InputPipeline {
    #surface;
    #root;
    #model;
    #commands;
    #unstyle;
    #sanitize;
    #aliases;
    #controller;
    #pending = null;
    #source = null;
    #deferred = null;
    #composing = false;
    #connected = true;

    constructor(surface, {model = htmlModel, commands = null, unstyle = defaultUnstyle,
        sanitize = sanitizePolicy, aliases = importAliases} = {}) {
        const root = surface?.element;
        if (root?.nodeType !== Node.ELEMENT_NODE || typeof surface?.transact !== 'function') {
            throw new TypeError('An input pipeline requires an editor surface');
        }
        if (typeof model?.block !== 'function' || typeof model?.allows !== 'function'
            || typeof model?.allowed !== 'function') {
            throw new TypeError('An input pipeline requires a content model');
        }
        if (commands !== null && (typeof commands?.input !== 'function' || typeof commands?.run !== 'function')) {
            throw new TypeError('An input pipeline requires a command registry');
        }
        if (unstyle !== null && typeof unstyle?.clean !== 'function') {
            throw new TypeError('An input pipeline requires an Unstyle policy or null');
        }
        if (sanitize !== null && typeof sanitize?.clean !== 'function') {
            throw new TypeError('An input pipeline requires a sanitize policy or null');
        }
        this.#surface = surface;
        this.#root = root;
        this.#model = model;
        this.#commands = commands;
        this.#unstyle = unstyle;
        this.#sanitize = sanitize;
        this.#aliases = aliases;
        this.#controller = new root.ownerDocument.defaultView.AbortController();
        const listen = {signal: this.#controller.signal};
        root.addEventListener('beforeinput', this.#beforeInput, listen);
        root.addEventListener('keydown', this.#keyDown, listen);
        root.addEventListener('input', this.#input, listen);
        root.addEventListener('compositionstart', this.#compositionStart, listen);
        root.addEventListener('compositionend', this.#compositionEnd, listen);
        root.addEventListener('paste', this.#paste, listen);
        root.addEventListener('drop', this.#drop, listen);
        root.addEventListener('click', this.#click, listen);
        surface.addEventListener('u2-rte-command', this.#command, listen);
        surface.addEventListener('u2-rte-disconnect', this.#disconnect, listen);
    }

    get surface() { return this.#surface; }
    get root() { return this.#root; }
    get commands() { return this.#commands; }
    get connected() { return this.#connected; }
    get composing() { return this.#composing; }

    normalize(trigger = 'command', {scope = null, range = null, inputType = '', imported = null} = {}) {
        if (!this.#connected) throw new DOMException('The input pipeline is disconnected', 'InvalidStateError');
        if (!TRIGGERS.has(trigger)) throw new TypeError('Unknown normalization trigger');
        const settings = this.#surface.config;
        if (!settings.cleanOn.includes(trigger)) return null;

        const model = this.#commands?.model || narrow(this.#model, settings.elements);
        const normalizer = new Normalizer(this.#root, {
            model,
            block: settings.block,
            level: settings.cleanup,
        });
        const snapshot = this.#surface.capture();
        const initial = snapshot ? rangePoints(snapshot.range()) : [];
        const result = this.#surface.transact(transaction => {
            let points = initial;
            // Where to repair is decided before anything moves: narrowing
            // dissolves the very nodes that say where the import landed.
            const reach = () => points.length
                ? EditRange.fromPoints(points[0], points.at(-1), this.#root).range()
                : range || selectionRange(this.#surface);
            let target = scope || normalizationScope(affected(reach(), imported, this.#root), this.#root, normalizer);
            // What may exist at all is decided before what it should look like.
            // A native paste is the one import the browser inserts itself, so
            // this is where the policy reaches it: elements first, because
            // unwrapping moves nodes, then attributes.
            // The host may declare its own attributes and protocols; everything else stays as configured.
            const sanitize = this.#sanitize && policyFor(settings, this.#sanitize);
            if (sanitize && settings.importSanitize === 'policy' && imported?.roots.length) {
                // Attributes first: removing them moves nothing, while narrowing
                // dissolves wrappers and would leave nothing left to clean.
                for (const root of imported.roots) {
                    sanitize.clean(root, {
                        preserve: imported.preserve,
                        base: this.#root.ownerDocument.baseURI,
                        classes: settings.classes.length ? settings.classes : null,
                    });
                }
                const map = new PointMap(points);
                for (const root of imported.roots) {
                    sanitize.narrow(root, {
                        map,
                        preserve: imported.preserve,
                        elements: importable(settings),
                        alias: this.#aliases,
                        // What the model already rejects is structural repair's
                        // job: it dissolves a block without joining two lines.
                        skip: element => !model.allows(element.parentNode, element),
                    });
                }
                points = points.map(point => map.get(point));
            }
            const unstyled = [];
            if (this.#unstyle && settings.importUnstyle !== 'none' && imported?.roots.length) {
                const map = new PointMap(points);
                for (const root of imported.roots) {
                    unstyled.push(...this.#unstyle.clean(root, {
                        through: settings.importUnstyle,
                        map,
                        transaction,
                        preserve: imported.preserve,
                        keep: settings.classes,
                    }));
                }
                points = points.map(point => map.get(point));
            }
            if (target !== this.#root && !this.#root.contains(target)) target = this.#root;
            const normalized = normalizer.normalize({scope: target, points, transaction});
            if (snapshot) EditRange.fromPoints(normalized.map.get(points[0]), normalized.map.get(points.at(-1)), this.#root)
                .select(this.#surface.core.selection, snapshot.backward);
            return unstyled.length
                ? Object.freeze({...normalized, unstyled: Object.freeze(unstyled)})
                : normalized;
        }, {trigger, inputType});
        if (result) this.#surface.emit('u2-rte-normalize', {trigger, inputType, result});
        return result || null;
    }

    dispose() {
        if (!this.#connected) return;
        this.#controller.abort();
        this.#clearPending();
        this.#source = null;
        this.#deferred = null;
        this.#composing = false;
        this.#connected = false;
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    #beforeInput = event => {
        if (!this.#owns(event)) return;
        this.#surface.capture();
        if (event.defaultPrevented) return;
        if (this.#route(event)) return;
        this.#clearPending();
        const pending = {
            inputType: event.inputType || '',
            range: inputRange(event, this.#surface),
            trigger: this.#source || inputTrigger(event.inputType),
        };
        this.#observe(pending);
        this.#pending = pending;
        this.#source = null;
        queueMicrotask(() => {
            if (this.#pending === pending) this.#clearPending();
        });
    };

    #keyDown = event => {
        if (!this.#owns(event)) return;
        const shortcut = this.#commands?.shortcut(event);
        if (shortcut) {
            this.#surface.capture();
            if (this.#invoke(event, shortcut, {range: selectionRange(this.#surface)})) return;
        }
        if (event.altKey) return;
        if ((event.key === 'Enter' || event.key === ' ') && this.#activation(event)) return;
        const inputType = keyInput(event);
        if (!inputType) return;
        this.#surface.capture();
        this.#route(event, {
            inputType,
            data: null,
            range: selectionRange(this.#surface),
        });
    };

    // In a button, Enter and Space belong to the button: the text inside never
    // sees them and no `beforeinput` arrives, so the editor puts in what the key
    // meant. Everywhere else the browser's own input is left alone.
    #activation(event) {
        if (event.ctrlKey || event.metaKey || !activatingAround(this.#root)) return false;
        this.#surface.capture();
        const range = selectionRange(this.#surface);
        if (event.key === 'Enter') return this.#route(event, {inputType: 'insertParagraph', data: null, range});
        const fragment = this.#root.ownerDocument.createDocumentFragment();
        fragment.append(space(range));
        return this.#invoke(event, 'insert', {fragment, range});
    }

    #input = event => {
        if (!this.#owns(event)) return;
        const pending = this.#pending;
        const inputType = event.inputType || pending?.inputType || '';
        const job = {
            inputType,
            range: pending?.range || inputRange(event, this.#surface),
            trigger: pending?.trigger || this.#source || inputTrigger(inputType),
            imported: takeImports(pending, this.#root),
        };
        this.#clearPending();
        this.#source = null;
        if (this.#composing || event.isComposing) {
            this.#deferred = job;
            return;
        }
        this.#deferred = null;
        this.normalize(job.trigger, job);
    };

    #compositionStart = event => {
        if (!this.#owns(event)) return;
        this.#composing = true;
        this.#deferred = null;
    };

    #compositionEnd = event => {
        if (!this.#owns(event)) return;
        this.#composing = false;
        queueMicrotask(() => {
            if (!this.#connected || this.#composing || !this.#deferred) return;
            const job = this.#deferred;
            this.#deferred = null;
            this.normalize(job.trigger, job);
        });
    };

    // An atomic element is addressable only as the selection: engines disagree
    // about whether pointing at one selects it, and a caret one leaves inside it
    // reaches nothing at all. The host itself is left alone — a surface is not a
    // thing inside itself.
    #click = event => {
        const target = event.composedPath()[0];
        if (target === this.#root || !this.#owns(event) || target?.nodeType !== Node.ELEMENT_NODE) return;
        // The base model, not the narrowed one: what an element is does not
        // depend on which elements a host allows, and narrowing costs a computed
        // style on a path every click in the text goes through.
        if (!this.#model.atomic(target)) return;
        const range = this.#root.ownerDocument.createRange();
        range.selectNode(target);
        const selection = this.#surface.core.selection;
        selection.removeAllRanges();
        selection.addRange(range);
        this.#surface.capture();
    };

    #paste = event => {
        if (this.#owns(event)) this.#rememberSource('paste');
    };

    #drop = event => {
        if (this.#owns(event)) this.#rememberSource('drop');
    };

    #command = event => {
        if (!event.detail.transaction) return;
        this.normalize('command', {inputType: event.detail.inputType || ''});
    };

    #disconnect = () => {
        this.dispose();
    };

    // Native editing that cannot be interoperable is prevented and replaced by
    // the registered command. Everything else keeps its native behavior and is
    // repaired afterwards.
    #route(event, detail = {
        inputType: event.inputType,
        data: event.data,
        range: inputRange(event, this.#surface),
    }) {
        const name = this.#commands?.input(detail.inputType);
        return !!name && this.#invoke(event, name, detail);
    }

    // A command replaces the native event only where it is actually available;
    // otherwise the key keeps its own meaning, which is what lets Tab go on
    // moving focus outside a list.
    #invoke(event, name, detail) {
        if (!event.cancelable || event.defaultPrevented || this.#composing
            || event.isComposing || isPlainTextHost(this.#root)) return false;
        if (!this.#commands.enabled(name, detail)) return false;
        event.preventDefault();
        this.#clearPending();
        this.#source = null;
        this.#commands.run(name, detail);
        return true;
    }

    #rememberSource(trigger) {
        this.#source = trigger;
        queueMicrotask(() => {
            if (this.#source === trigger) this.#source = null;
        });
    }

    // What arrived is tracked for every cleaned paste or drop, not only when
    // presentation cleanup is configured: structural repair needs to know where
    // the content landed just as much.
    #observe(pending) {
        const settings = this.#surface.config;
        if (!['paste', 'drop'].includes(pending.trigger) || !settings.cleanOn.includes(pending.trigger)) return;
        const records = [];
        const Observer = this.#root.ownerDocument.defaultView.MutationObserver;
        const observer = new Observer(next => records.push(...next));
        observer.observe(this.#root, {childList: true, subtree: true});
        pending.import = {
            observer,
            records,
            preserve: new Set(this.#root.querySelectorAll('*')),
        };
    }

    #clearPending() {
        this.#pending?.import?.observer.disconnect();
        this.#pending = null;
    }

    #owns(event) {
        const target = event.composedPath()[0];
        return target === this.#root || editingHost(target) === this.#root;
    }
}

// A plain space collapses away where there is nothing after it, or where another
// space already is — so there the browser types a non-breaking one, and so does
// this. Anywhere else a space is a space.
function space(range) {
    const node = range?.startContainer;
    if (node?.nodeType !== Node.TEXT_NODE) return '\u00a0';
    const before = range.startOffset ? node.data[range.startOffset - 1] : '';
    return before.trim() && range.startOffset < node.length ? ' ' : '\u00a0';
}

function keyInput(event) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return null;
    return DELETE_KEYS.get(event.key) || null;
}

export function inputTrigger(inputType = '') {
    if (PASTE.has(inputType)) return 'paste';
    if (inputType === 'insertFromDrop') return 'drop';
    return 'input';
}

// Pasted or dropped content is not where the caret ends up — the caret sits at
// the end of it. Cleanup has to cover what actually arrived, or a pasted
// document is only ever repaired in its last block.
function affected(range, imported, root) {
    let common = range?.commonAncestorContainer || null;
    for (const node of imported?.roots || []) {
        if (!root.contains(node)) continue;
        common = common ? shared(common, node, root) : node;
    }
    return common;
}

function shared(node, other, root) {
    let current = node;
    while (current && current !== root && current !== other && !current.contains(other)) {
        current = current.parentNode;
    }
    return current || root;
}

// What may arrive is the import policy bounded by what the host tolerates at
// all; either alone may be open.
function importable(settings) {
    if (settings.importElements === null) return settings.elements;
    if (settings.elements === null) return settings.importElements;
    return settings.importElements.filter(name => settings.elements.includes(name));
}

function normalizationScope(node, root, normalizer) {
    let element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    if (!element || (element !== root && !root.contains(element))) return root;
    while (element !== root && !normalizer.planner.model.block(element)) element = element.parentElement;
    if (element === root) return root;
    const parent = element.parentElement;
    return normalizer.planner.plan(parent, element).type === 'keep' ? element : parent;
}

export function inputRange(event, surface) {
    const target = event.getTargetRanges?.()[0];
    if (!target) return selectionRange(surface);
    try {
        const range = surface.element.ownerDocument.createRange();
        range.setStart(target.startContainer, target.startOffset);
        range.setEnd(target.endContainer, target.endOffset);
        return surface.element.contains(range.commonAncestorContainer) ? range : null;
    } catch {
        return null;
    }
}

function selectionRange(surface) {
    return SelectionSnapshot.capture(surface.core.selection, surface.element)?.range() || null;
}

function rangePoints(range) {
    const start = Point.fromRange(range, 'start');
    return range.collapsed ? [start] : [start, Point.fromRange(range, 'end')];
}

function takeImports(pending, root) {
    if (!pending?.import) return null;
    const {observer, records, preserve} = pending.import;
    records.push(...observer.takeRecords());
    const roots = importRoots(records.flatMap(record => [...record.addedNodes]), root, preserve);
    return roots.length ? {roots, preserve} : null;
}

function importRoots(nodes, root, preserve) {
    const elements = new Set();
    for (const node of nodes) {
        if (node.nodeType !== Node.ELEMENT_NODE || !root.contains(node)) continue;
        if (!preserve.has(node)) elements.add(node);
        for (const child of node.querySelectorAll('*')) if (!preserve.has(child)) elements.add(child);
    }
    const added = [...elements];
    return added.filter(node => !added.some(parent => parent !== node && parent.contains(node)));
}

