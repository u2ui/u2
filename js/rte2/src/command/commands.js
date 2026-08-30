import {Edit, narrow} from './edit.js';
import {htmlModel} from '../model/html/html-model.js';

// Named editor commands for one surface. A command is a plain object with
// `run(edit)`, optional `enabled(edit)` and `state(edit)`, and the native
// `inputTypes` it replaces. Availability, state, execution, and input routing
// stay separate so a UI, a keyboard module, and the input pipeline can use the
// same registry.
export class Commands {
    #surface;
    #model;
    #commands = new Map();
    #inputs = new Map();

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
        this.delete(name);
        this.#commands.set(name, command);
        for (const inputType of command.inputTypes || []) this.#inputs.set(inputType, name);
        return this;
    }

    delete(name) {
        if (!this.#commands.has(name)) return false;
        for (const [inputType, owner] of this.#inputs) if (owner === name) this.#inputs.delete(inputType);
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
        }, {trigger: 'command', command: name, inputType: detail.inputType || ''});
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
