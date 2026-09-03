import {inputRange} from './input-pipeline.js';
import {editingHost, isPlainTextHost} from '../selection/ownership/ownership.js';

const INPUTS = new Set(['insertFromPaste', 'insertFromDrop']);

// Owns rich external HTML before the browser can insert it. The selected
// sanitizer, optional presentation cleanup, and mapped insertion command stay
// replaceable; this class only composes them for native input events.
export class ExternalInput {
    #surface;
    #root;
    #commands;
    #sanitizer;
    #unstyle;
    #through;
    #command;
    #controller;
    #connected = true;

    constructor(surface, {
        commands,
        sanitizer,
        unstyle = null,
        through = null,
        command = 'insertFragment',
    } = {}) {
        const root = surface?.element;
        if (root?.nodeType !== Node.ELEMENT_NODE || typeof surface?.emit !== 'function') {
            throw new TypeError('External input requires an editor surface');
        }
        if (typeof commands?.has !== 'function' || typeof commands?.run !== 'function') {
            throw new TypeError('External input requires a command registry');
        }
        if (typeof command !== 'string' || !command.trim() || !commands.has(command)) {
            throw new RangeError('External input requires a registered insertion command');
        }
        if (typeof sanitizer?.sanitize !== 'function') {
            throw new TypeError('External input requires a sanitizer');
        }
        if (unstyle !== null && typeof unstyle?.clean !== 'function') {
            throw new TypeError('External input cleanup requires an Unstyle policy');
        }
        if (through !== null && typeof through !== 'string' && typeof through !== 'function') {
            throw new TypeError('External input cleanup level must be a string, function, or null');
        }
        if (through !== null && !unstyle) {
            throw new TypeError('External input cleanup level requires an Unstyle policy');
        }
        this.#surface = surface;
        this.#root = root;
        this.#commands = commands;
        this.#sanitizer = sanitizer;
        this.#unstyle = unstyle;
        this.#through = through;
        this.#command = command.trim();
        this.#controller = new root.ownerDocument.defaultView.AbortController();
        const listen = {signal: this.#controller.signal};
        root.addEventListener('beforeinput', this.#beforeInput, listen);
        surface.addEventListener('u2-rte-disconnect', this.#disconnect, listen);
    }

    get surface() { return this.#surface; }
    get connected() { return this.#connected; }

    insert(html, {range = null, inputType = ''} = {}) {
        if (!this.#connected) throw new DOMException('External input is disconnected', 'InvalidStateError');
        if (typeof html !== 'string') throw new TypeError('External HTML must be a string');
        const fragment = this.#sanitizer.sanitize(html, {
            document: this.#root.ownerDocument,
            base: this.#root.ownerDocument.baseURI,
            elements: this.#surface.config.elements,
            classes: this.#surface.config.classes.length ? this.#surface.config.classes : null,
        });
        if (fragment?.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
            throw new TypeError('A sanitizer must return a DocumentFragment');
        }
        const through = typeof this.#through === 'function'
            ? this.#through(Object.freeze({surface: this.#surface, inputType}))
            : this.#through;
        if (through !== null && through !== 'none') {
            this.#unstyle.clean(fragment, {through, keep: this.#surface.config.classes});
        }
        if (!fragment.childNodes.length) return [];
        return this.#commands.run(this.#command, {fragment, range, inputType});
    }

    dispose() {
        if (!this.#connected) return;
        this.#controller.abort();
        this.#connected = false;
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    #beforeInput = event => {
        if (!this.#owns(event) || !INPUTS.has(event.inputType) || !event.cancelable
            || event.defaultPrevented || event.isComposing || isPlainTextHost(this.#root)) return;
        if (!hasMarkup(event.dataTransfer)) return;
        event.preventDefault();
        try {
            const html = event.dataTransfer.getData('text/html');
            const range = inputRange(event, this.#surface);
            this.insert(html, {range, inputType: event.inputType});
        } catch (error) {
            this.#surface.emit('u2-rte-error', {
                transaction: null,
                error,
                phase: 'external-input',
                inputType: event.inputType,
            });
        }
    };

    #disconnect = () => {
        this.dispose();
    };

    #owns(event) {
        const target = event.composedPath()[0];
        return target === this.#root || editingHost(target) === this.#root;
    }
}

// An html flavor carrying no markup is text that was labelled html — a pdf viewer offers its
// selection that way. Importing it as html would collapse the line breaks it carries, while the
// browser inserts the text flavor with them intact, so that one stays with the browser.
function hasMarkup(transfer) {
    if (!transfer || typeof transfer.getData !== 'function') return false;
    const types = [...(transfer.types || [])].map(type => String(type).toLowerCase());
    if (!types.includes('text/html')) return false;
    if (!types.includes('text/plain')) return true;
    return /<[a-z!/]/i.test(transfer.getData('text/html'));
}
