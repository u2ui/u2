import {Commands} from '../command/commands.js';
import {deleteBackward, deleteForward} from '../command/delete.js';
import {enter, lineBreak} from '../command/enter.js';
import {History} from '../history/history.js';
import {PendingMarks} from '../command/pending-marks.js';
import {InputPipeline} from '../input/input-pipeline.js';
import {history as historyModule} from './history.js';
import {marks} from './marks.js';
import {structure} from './structure.js';
import {isPlainTextHost} from '../selection/ownership/ownership.js';
import {Chrome} from '../ui/chrome.js';
import {place} from '../ui/place.js';
import {Toolbar} from '../ui/toolbar.js';

const STYLE = `
#toolbar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: .17em;
    line-height: 1;
    max-inline-size: 24.5em;
    transition: left .14s, top .14s;

    &[data-placing] { transition: none; }
    @media (prefers-reduced-motion: reduce) { & { transition: none; } }
    button, select { min-block-size: 2.29em; }
    button {
        border-radius: .34em;
        min-inline-size: 2.29em;
        &:hover:not(:disabled) { background: color-mix(in srgb, Highlight 16%, transparent); }
        &[aria-pressed=true] { background: color-mix(in srgb, Highlight 28%, transparent); }
    }
    [data-command=bold] { font-weight: 700; }
}
`;

const CLIENT = Symbol.for('u2.rte.editor');

// Minimal convention client for the default editor stack. It exposes the
// per-surface registry and a narrow registration point for optional command
// modules without turning the client into a plugin framework.
export class Editor {
    #core;
    #document;
    #records = new Map();
    #modules = new Map();
    #setups = new Map();
    #sources = new WeakMap();
    #chrome = null;
    #toolbar = null;
    #element = null;
    #dynamic = new Map();
    #controller;
    #connected = true;

    constructor(core) {
        if (!core?.root || !Array.isArray(core.surfaces) || typeof core?.addEventListener !== 'function') {
            throw new TypeError('An editor client requires an editor core');
        }
        if (core[CLIENT]) throw new RangeError('An editor core already has a convention client');
        this.#core = core;
        this.#document = core.root.nodeType === Node.DOCUMENT_NODE ? core.root : core.root.ownerDocument;
        Object.defineProperty(core, CLIENT, {value: this, configurable: true});
        this.#controller = new this.#document.defaultView.AbortController();
        try {
            const listen = {signal: this.#controller.signal};
            core.addEventListener('u2-rte-add', this.#add, listen);
            core.addEventListener('u2-rte-activechange', this.#activeChange, listen);
            core.addEventListener('u2-rte-dispose', this.#coreDispose, listen);
            for (const module of [historyModule, marks, structure]) this.add(module);
            for (const surface of core.surfaces) this.#setup(surface);
            this.refresh();
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    get core() { return this.#core; }

    // One shadow root for everything this editor draws. It is made on first use,
    // so an editor that never shows anything adds nothing to the document.
    get chrome() {
        if (!this.#chrome) {
            this.#chrome = new Chrome(this.#core.root, {name: 'editor'});
            this.#core.retain(this.#chrome.element);
        }
        return this.#chrome;
    }
    get toolbar() { return this.#toolbar; }
    get connected() { return this.#connected; }

    commands(surface) {
        return this.#records.get(surface)?.commands || null;
    }

    // What this editor offers, by control name, so an application can build its
    // own list of what `--u2-rte-toolbar` may choose from without guessing.
    get controls() {
        const result = [];
        for (const module of this.#modules.values()) {
            for (const control of module.toolbar) {
                result.push(Object.freeze({
                    name: control.name || control.command,
                    command: control.command,
                    label: control.label,
                    module: module.name,
                }));
            }
        }
        return result;
    }

    history(surface) {
        return this.#records.get(surface)?.history || null;
    }

    add(source) {
        if (!this.#connected) {
            throw new this.#document.defaultView.DOMException('The editor client is disposed', 'InvalidStateError');
        }
        const known = source && typeof source === 'object' ? this.#sources.get(source) : null;
        if (known && this.#modules.has(known)) return this;
        const module = validModule(source);
        const current = this.#modules.get(module.name);
        if (current) throw new RangeError(`Editor module already exists: ${module.name}`);
        const installed = [];
        let setup = null;
        try {
            setup = lifecycle(module.setup?.(Object.freeze({
                editor: this,
                core: this.#core,
                root: this.#core.root,
                chrome: this.chrome,
            })), 'Editor module setup()');
            for (const record of this.#records.values()) {
                this.#install(record, module);
                installed.push(record);
            }
        } catch (error) {
            for (const record of installed) this.#uninstall(record, module.name);
            setup?.dispose();
            throw error;
        }
        this.#modules.set(module.name, module);
        if (setup) this.#setups.set(module.name, setup);
        this.#sources.set(source, module.name);
        this.#append(module);
        this.refresh();
        return this;
    }

    delete(value) {
        const name = typeof value === 'string' ? value.trim() : this.#sources.get(value);
        const module = this.#modules.get(name);
        if (!module) return false;
        for (const record of this.#records.values()) {
            this.#uninstall(record, name);
            // A removed formatting command must not affect the next text input.
            // Module topology changes therefore cancel all transient caret marks.
            record.pending.clear();
        }
        this.#modules.delete(name);
        this.#setups.get(name)?.dispose();
        this.#setups.delete(name);
        this.#sources.delete(module.source);
        if (this.#element) {
            for (const item of [...this.#element.children]) {
                if (item.dataset.u2RteModule !== name) continue;
                this.#dynamic.delete(item);
                item.remove();
            }
        }
        this.refresh();
        return true;
    }

    refresh() {
        if (!this.#connected) return false;
        const surface = this.#core.active;
        if (this.#records.has(surface) && surface.config.ui === 'roaming') this.#ensureToolbar();
        this.#chrome?.follow(this.#records.has(surface) ? surface.element : null);
        // A control whose choices come from the host's configuration is filled
        // for the surface that is about to be shown, not once at registration.
        for (const [select, choices] of this.#dynamic) {
            options(select, this.#records.has(surface) ? choices(surface) : []);
        }
        return this.#toolbar?.refresh() || false;
    }

    dispose() {
        if (!this.#connected) return;
        this.#controller.abort();
        for (const surface of [...this.#records.keys()]) this.#drop(surface);
        this.#toolbar?.dispose();
        if (this.#chrome) this.#core.release(this.#chrome.element);
        // The chrome reference is kept: its getter must not build a new one for
        // a client that is gone.
        this.#chrome?.dispose();
        this.#dynamic.clear();
        this.#toolbar = null;
        this.#element = null;
        for (const setup of [...this.#setups.values()].reverse()) setup.dispose();
        this.#setups.clear();
        this.#modules.clear();
        if (this.#core[CLIENT] === this) delete this.#core[CLIENT];
        this.#connected = false;
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    #setup(surface) {
        if (this.#records.has(surface) || isPlainTextHost(surface.element)) return null;
        const pending = new PendingMarks(surface);
        const history = new History(surface);
        const commands = new Commands(surface, {commands: {
            deleteBackward,
            deleteForward,
            enter,
            lineBreak,
            insertText: pending.insertText,
        }});
        const controller = new this.#document.defaultView.AbortController();
        const record = {surface, pending, history, commands, pipeline: null, controller, modules: new Map()};
        try {
            for (const module of this.#modules.values()) this.#install(record, module);
            record.pipeline = new InputPipeline(surface, {commands});
            surface.addEventListener('u2-rte-disconnect', () => this.#drop(surface), {signal: controller.signal});
            this.#records.set(surface, record);
        } catch (error) {
            for (const name of [...record.modules.keys()].reverse()) this.#uninstall(record, name);
            record.pipeline?.dispose();
            history.dispose();
            pending.dispose();
            controller.abort();
            throw error;
        }
        return commands;
    }

    #drop(surface) {
        const record = this.#records.get(surface);
        if (!record) return false;
        record.controller.abort();
        for (const name of [...record.modules.keys()].reverse()) this.#uninstall(record, name);
        record.pipeline?.dispose();
        record.history.dispose();
        record.pending.dispose();
        this.#records.delete(surface);
        return true;
    }

    #install(record, module) {
        const context = Object.freeze({
            editor: this,
            surface: record.surface,
            pending: record.pending,
            history: record.history,
            commands: record.commands,
        });
        const result = module.commands ? module.commands(context) : {};
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
            throw new TypeError('Editor module commands() must return an object');
        }
        const entries = Object.entries(result);
        const inputs = new Map();
        for (const [name] of entries) {
            if (record.commands.has(name)) throw new RangeError(`Editor command already exists: ${name}`);
        }
        for (const [name, command] of entries) {
            for (const inputType of command?.inputTypes || []) {
                const owner = record.commands.input(inputType) || inputs.get(inputType);
                if (owner && owner !== name) {
                    throw new RangeError(`Editor input type already belongs to ${owner}: ${inputType}`);
                }
                inputs.set(inputType, name);
            }
        }
        const names = [];
        let attached = null;
        try {
            for (const [name, command] of entries) {
                record.commands.add(name, command);
                names.push(name);
            }
            attached = lifecycle(module.attach?.(context), 'Editor module attach()');
        } catch (error) {
            attached?.dispose();
            for (const name of names) record.commands.delete(name);
            throw error;
        }
        record.modules.set(module.name, {names, attached});
    }

    #uninstall(record, name) {
        const installed = record.modules.get(name);
        if (!installed) return false;
        installed.attached?.dispose();
        for (const command of installed.names) record.commands.delete(command);
        return record.modules.delete(name);
    }

    #ensureToolbar() {
        if (this.#toolbar) return this.#toolbar;
        const element = this.chrome.part('toolbar', STYLE);
        element.className = 'panel';
        element.setAttribute('aria-label', 'Text formatting');
        this.#element = element;
        for (const module of this.#modules.values()) this.#append(module);
        this.#toolbar = new Toolbar(this.#core, element, {
            commands: surface => this.commands(surface),
            place,
        });
        return this.#toolbar;
    }

    #append(module) {
        if (!this.#element) return;
        for (const control of module.toolbar || []) {
            if (control.type === 'select') {
                const select = this.#document.createElement('select');
                select.dataset.commandValue = control.command;
                select.dataset.control = control.name;
                select.dataset.u2RteModule = module.name;
                select.setAttribute('aria-label', control.label);
                select.title = control.label;
                const placeholder = this.#document.createElement('option');
                placeholder.textContent = control.label;
                placeholder.value = '';
                placeholder.disabled = true;
                select.append(placeholder);
                if (typeof control.options === 'function') this.#dynamic.set(select, control.options);
                else options(select, control.options);
                this.#element.append(select);
                continue;
            }
            const item = this.#document.createElement('button');
            item.type = 'button';
            item.dataset.command = control.command;
            if (control.name) item.dataset.control = control.name;
            item.dataset.u2RteModule = module.name;
            if (control.shortcut) item.dataset.shortcut = control.shortcut;
            if (control.state) item.setAttribute('data-state', '');
            item.setAttribute('aria-label', control.label);
            item.title = control.shortcut ? `${control.label} (${keyLabel(control.shortcut)})` : control.label;
            item.textContent = control.text;
            this.#element.append(item);
        }
    }

    #add = event => this.#setup(event.detail.surface);
    #activeChange = () => this.refresh();
    #coreDispose = () => this.dispose();
}

function validModule(module) {
    if (!module || typeof module !== 'object') throw new TypeError('An editor module must be an object');
    if (typeof module.name !== 'string' || !module.name.trim()) {
        throw new TypeError('An editor module name must be a non-empty string');
    }
    for (const name of ['commands', 'setup', 'attach']) {
        if (module[name] !== undefined && typeof module[name] !== 'function') {
            throw new TypeError(`Editor module ${name} must be a function`);
        }
    }
    if (!module.commands && !module.setup && !module.attach) {
        throw new TypeError('An editor module must implement commands(), setup(), or attach()');
    }
    if (module.toolbar !== undefined && !Array.isArray(module.toolbar)) {
        throw new TypeError('An editor module toolbar must be an array');
    }
    const toolbar = (module.toolbar || []).map(control => {
        if (!control || typeof control !== 'object') throw new TypeError('An editor toolbar control must be an object');
        const type = control.type || 'button';
        if (type === 'select') {
            for (const property of ['name', 'command', 'label']) {
                if (typeof control[property] !== 'string' || !control[property].trim()) {
                    throw new TypeError(`An editor toolbar select requires ${property}`);
                }
            }
            if (typeof control.options === 'function') {
                return Object.freeze({...control, type});
            }
            if (!Array.isArray(control.options) || !control.options.length) {
                throw new TypeError('An editor toolbar select requires options');
            }
            const choices = control.options.map(option => {
                if (!option || typeof option !== 'object') {
                    throw new TypeError('An editor toolbar option must be an object');
                }
                for (const property of ['value', 'label']) {
                    if (typeof option[property] !== 'string' || !option[property].trim()) {
                        throw new TypeError(`An editor toolbar option requires ${property}`);
                    }
                }
                return Object.freeze({...option});
            });
            return Object.freeze({...control, type, options: Object.freeze(choices)});
        }
        if (type !== 'button') throw new TypeError(`Unknown editor toolbar control: ${type}`);
        for (const property of ['command', 'label', 'text']) {
            if (typeof control[property] !== 'string' || !control[property].trim()) {
                throw new TypeError(`An editor toolbar control requires ${property}`);
            }
        }
        if (control.shortcut !== undefined && (typeof control.shortcut !== 'string' || !control.shortcut.trim())) {
            throw new TypeError('An editor toolbar shortcut must be a non-empty string');
        }
        if (control.name !== undefined && (typeof control.name !== 'string' || !control.name.trim())) {
            throw new TypeError('An editor toolbar control name must be a non-empty string');
        }
        if (control.state !== undefined && typeof control.state !== 'boolean') {
            throw new TypeError('An editor toolbar state flag must be boolean');
        }
        return Object.freeze({...control, type});
    });
    return Object.freeze({
        name: module.name.trim(),
        commands: module.commands,
        setup: module.setup,
        attach: module.attach,
        toolbar: Object.freeze(toolbar),
        source: module,
    });
}

function lifecycle(value, label) {
    if (value == null) return null;
    if (typeof value !== 'object' || typeof value.dispose !== 'function') {
        throw new TypeError(`${label} must return an object with dispose()`);
    }
    return value;
}

// `ctrl+shift+8` reads as `Ctrl+Shift+8`. Ctrl stands for Command on Apple
// keyboards, which is what the registry matches.
function keyLabel(shortcut) {
    return shortcut.split(' ')[0].split('+')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('+');
}

// Rewrites a select's choices, keeping its disabled placeholder and leaving the
// element alone when nothing changed.
function options(select, choices) {
    const current = [...select.options].slice(1);
    if (current.length === choices.length
        && current.every((option, index) => option.value === choices[index].value
            && option.textContent === choices[index].label)) return false;
    for (const option of current) option.remove();
    for (const choice of choices) {
        const option = select.ownerDocument.createElement('option');
        option.textContent = choice.label;
        option.value = choice.value;
        select.append(option);
    }
    return true;
}
