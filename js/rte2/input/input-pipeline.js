import {htmlModel} from '../model/html/html-model.js';
import {Normalizer} from '../normalize/normalizer/normalizer.js';
import {EditRange} from '../selection/range/edit-range.js';
import {editingHost, isPlainTextHost} from '../selection/ownership/ownership.js';
import {Point} from '../selection/point/point.js';
import {SelectionSnapshot} from '../selection/snapshot.js';

const TRIGGERS = new Set(['input', 'paste', 'drop', 'command']);
const PASTE = new Set(['insertFromPaste', 'insertFromPasteAsQuotation']);

export class InputPipeline {
    #surface;
    #root;
    #model;
    #commands;
    #controller;
    #pending = null;
    #source = null;
    #deferred = null;
    #composing = false;
    #connected = true;

    constructor(surface, {model = htmlModel, commands = null} = {}) {
        const root = surface?.element;
        if (root?.nodeType !== Node.ELEMENT_NODE || typeof surface?.transact !== 'function') {
            throw new TypeError('An input pipeline requires an editor surface');
        }
        if (typeof model?.block !== 'function' || typeof model?.allows !== 'function') {
            throw new TypeError('An input pipeline requires a content model');
        }
        if (commands !== null && (typeof commands?.input !== 'function' || typeof commands?.run !== 'function')) {
            throw new TypeError('An input pipeline requires a command registry');
        }
        this.#surface = surface;
        this.#root = root;
        this.#model = model;
        this.#commands = commands;
        this.#controller = new root.ownerDocument.defaultView.AbortController();
        const listen = {signal: this.#controller.signal};
        root.addEventListener('beforeinput', this.#beforeInput, listen);
        root.addEventListener('input', this.#input, listen);
        root.addEventListener('compositionstart', this.#compositionStart, listen);
        root.addEventListener('compositionend', this.#compositionEnd, listen);
        root.addEventListener('paste', this.#paste, listen);
        root.addEventListener('drop', this.#drop, listen);
        surface.addEventListener('u2-rte-command', this.#command, listen);
        surface.addEventListener('u2-rte-disconnect', this.#disconnect, listen);
    }

    get surface() { return this.#surface; }
    get root() { return this.#root; }
    get commands() { return this.#commands; }
    get connected() { return this.#connected; }
    get composing() { return this.#composing; }

    normalize(trigger = 'command', {scope = null, range = null, inputType = ''} = {}) {
        if (!this.#connected) throw new DOMException('The input pipeline is disconnected', 'InvalidStateError');
        if (!TRIGGERS.has(trigger)) throw new TypeError('Unknown normalization trigger');
        const settings = this.#surface.config;
        if (!settings.cleanOn.includes(trigger)) return null;

        const normalizer = new Normalizer(this.#root, {
            model: this.#model,
            block: settings.block,
            level: settings.cleanup,
        });
        scope ||= normalizationScope(range || selectionRange(this.#surface), this.#root, normalizer);
        const snapshot = this.#surface.capture();
        const points = snapshot ? rangePoints(snapshot.range()) : [];
        const result = this.#surface.transact(transaction => {
            const result = normalizer.normalize({scope, points, transaction});
            if (snapshot) EditRange.fromPoints(result.map.get(points[0]), result.map.get(points.at(-1)), this.#root)
                .select(this.#surface.core.selection, snapshot.backward);
            return result;
        }, {trigger, inputType});
        if (result) this.#surface.emit('u2-rte-normalize', {trigger, inputType, result});
        return result || null;
    }

    destroy() {
        if (!this.#connected) return;
        this.#controller.abort();
        this.#pending = null;
        this.#source = null;
        this.#deferred = null;
        this.#composing = false;
        this.#connected = false;
    }

    #beforeInput = event => {
        if (!this.#owns(event)) return;
        this.#surface.capture();
        if (this.#route(event)) return;
        const pending = {
            inputType: event.inputType || '',
            range: eventRange(event, this.#surface),
            trigger: this.#source || inputTrigger(event.inputType),
        };
        this.#pending = pending;
        this.#source = null;
        queueMicrotask(() => {
            if (this.#pending === pending) this.#pending = null;
        });
    };

    #input = event => {
        if (!this.#owns(event)) return;
        const inputType = event.inputType || this.#pending?.inputType || '';
        const job = {
            inputType,
            range: this.#pending?.range || eventRange(event, this.#surface),
            trigger: this.#pending?.trigger || this.#source || inputTrigger(inputType),
        };
        this.#pending = null;
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

    #paste = event => {
        if (this.#owns(event)) this.#rememberSource('paste');
    };

    #drop = event => {
        if (this.#owns(event)) this.#rememberSource('drop');
    };

    #command = event => {
        this.normalize('command', {inputType: event.detail.inputType || ''});
    };

    #disconnect = () => {
        this.destroy();
    };

    // Native editing that cannot be interoperable is prevented and replaced by
    // the registered command. Everything else keeps its native behavior and is
    // repaired afterwards.
    #route(event) {
        if (!this.#commands || !event.cancelable || this.#composing || isPlainTextHost(this.#root)) return false;
        const name = this.#commands.input(event.inputType);
        if (!name) return false;
        const detail = {inputType: event.inputType, range: eventRange(event, this.#surface)};
        if (!this.#commands.enabled(name, detail)) return false;
        event.preventDefault();
        this.#pending = null;
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

    #owns(event) {
        const target = event.composedPath()[0];
        return target === this.#root || editingHost(target) === this.#root;
    }
}

export function inputTrigger(inputType = '') {
    if (PASTE.has(inputType)) return 'paste';
    if (inputType === 'insertFromDrop') return 'drop';
    return 'input';
}

function normalizationScope(range, root, normalizer) {
    let element = range?.commonAncestorContainer;
    if (element?.nodeType !== Node.ELEMENT_NODE) element = element?.parentElement;
    if (!element || (element !== root && !root.contains(element))) return root;
    while (element !== root && !normalizer.planner.model.block(element)) element = element.parentElement;
    if (element === root) return root;
    const parent = element.parentElement;
    return normalizer.planner.plan(parent, element).type === 'keep' ? element : parent;
}

function eventRange(event, surface) {
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
