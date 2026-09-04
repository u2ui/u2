import {Edit, narrow} from './edit.js';
import {htmlModel} from '../model/html/html-model.js';

// Named editor commands for one surface. A command is a plain object with
// `run(edit)`, optional `enabled(edit)` and `state(edit)`, the native
// `inputTypes` it replaces, and an optional keyboard `shortcut`. Availability,
// state, execution, input routing, and keys stay separate so a UI, a keyboard
// module, and the input pipeline can use the same registry.
//
// Shortcuts belong here rather than to a toolbar so a key works whether or not
// a control for it is on screen.
export class Commands {
    #surface;
    #model;
    #commands = new Map();
    #inputs = new Map();
    #keys = new Map();

    constructor(surface, {model = htmlModel, commands = {}} = {}) {
        if (typeof surface?.transact !== 'function') throw new TypeError('A command registry requires an editor surface');
        if (typeof model?.allows !== 'function' || typeof model?.allowed !== 'function') {
            throw new TypeError('A command registry requires a content model');
        }
        this.#surface = surface;
        this.#model = model;
        for (const [name, command] of Object.entries(commands)) this.add(name, command);
    }

    get surface() { return this.#surface; }
    get model() {
        return narrow(this.#model, this.#surface.config.elements);
    }
    get names() { return [...this.#commands.keys()]; }

    add(name, command) {
        if (typeof name !== 'string' || !name.trim()) throw new TypeError('A command name must be a non-empty string');
        if (typeof command?.run !== 'function') throw new TypeError('A command must implement run()');
        if (command.enabled !== undefined && typeof command.enabled !== 'function') {
            throw new TypeError('Command availability must be a function');
        }
        if (command.state !== undefined && typeof command.state !== 'function') {
            throw new TypeError('Command state must be a function');
        }
        if (command.transaction !== undefined && typeof command.transaction !== 'boolean') {
            throw new TypeError('Command transaction flag must be boolean');
        }
        const keys = chords(command.shortcut);
        this.delete(name);
        this.#commands.set(name, command);
        for (const inputType of command.inputTypes || []) this.#inputs.set(inputType, name);
        for (const key of keys) this.#keys.set(key, name);
        return this;
    }

    delete(name) {
        if (!this.#commands.has(name)) return false;
        for (const [inputType, owner] of this.#inputs) if (owner === name) this.#inputs.delete(inputType);
        for (const [key, owner] of this.#keys) if (owner === name) this.#keys.delete(key);
        return this.#commands.delete(name);
    }

    get(name) {
        return this.#commands.get(name) || null;
    }

    has(name) {
        return this.#commands.has(name);
    }

    input(inputType) {
        return this.#inputs.get(inputType) || null;
    }

    // The command a keystroke denotes, or null.
    shortcut(event) {
        return this.#keys.get(chord(event)) || null;
    }

    get keys() {
        return new Map(this.#keys);
    }

    enabled(name, detail) {
        const command = this.#commands.get(name);
        return !!command && this.#allows(command, this.#edit(null, detail));
    }

    state(name, detail) {
        const command = this.#commands.get(name);
        if (!command?.state) return null;
        return command.state(this.#edit(null, detail));
    }

    run(name, detail = {}) {
        const command = this.#commands.get(name);
        if (!command) throw new RangeError(`Unknown command: ${name}`);
        const edit = this.#edit(null, detail);
        if (!this.#allows(command, edit)) return;
        if (command.transaction === false) {
            const result = command.run(edit);
            this.#surface.emit('u2-rte-command', {name, inputType: edit.inputType, transaction: null, result});
            return result;
        }
        return this.#surface.transact(transaction => {
            const edit = this.#edit(transaction, detail);
            // The transaction restores the saved selection, so availability is
            // decided again against the state the command actually sees.
            if (!this.#allows(command, edit)) return;
            const result = command.run(edit);
            this.#surface.emit('u2-rte-command', {name, inputType: edit.inputType, transaction: edit.transaction, result});
            return result;
        // A caller may mark a run as ongoing input — a field edited live, a
        // slider dragged — so history groups it instead of recording a step per
        // keystroke.
        }, {trigger: detail.trigger === 'input' ? 'input' : 'command', command: name, inputType: detail.inputType || ''});
    }

    // The base model is handed over unnarrowed: `Edit` resolves it only if the
    // command actually consults it.
    #edit(transaction, detail) {
        return new Edit(this.#surface, transaction, {model: this.#model, ...detail});
    }

    #allows(command, edit) {
        return command.enabled ? !!command.enabled(edit) : !!edit.range;
    }
}

const MODIFIERS = ['ctrl', 'alt', 'shift'];

// A shortcut is one or more chords separated by spaces, each written as
// `[modifier+]*key`. `ctrl` matches Control or Command, so one declaration
// serves both platforms.
function chords(value) {
    if (value === undefined || value === null) return [];
    if (typeof value !== 'string' || !value.trim()) throw new TypeError('A command shortcut must be a non-empty string');
    return value.trim().toLowerCase().split(/\s+/).map(item => {
        const parts = item.split('+');
        const key = parts.pop();
        if (!key || parts.some(part => !MODIFIERS.includes(part)) || new Set(parts).size !== parts.length) {
            throw new TypeError(`Invalid command shortcut: ${item}`);
        }
        return [...MODIFIERS.filter(name => parts.includes(name)), key].join('+');
    });
}

// The chord a keyboard event denotes. A digit is read from its physical key, so
// a shifted digit is the same shortcut on every keyboard layout, while letters
// keep their layout meaning.
function chord(event) {
    const digit = /^Digit(\d)$/.exec(event.code || '');
    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(digit ? digit[1] : String(event.key).toLowerCase());
    return parts.join('+');
}
