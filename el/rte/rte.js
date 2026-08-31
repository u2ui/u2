import {Source, editor} from '../../js/rte/rte.js';

const codecs = {
    html: () => ({
        parse: value => value,
        serialize: value => value,
    }),
    markdown: async () => {
        const [{parse}, {default: TurndownService}] = await Promise.all([
            // deno-lint-ignore no-import-prefix
            import('https://cdn.jsdelivr.net/npm/marked@16.2.1/+esm'),
            // deno-lint-ignore no-import-prefix
            import('https://cdn.jsdelivr.net/npm/turndown@7.2.0/+esm'),
        ]);
        const turndown = new TurndownService({headingStyle: 'atx'});
        return {
            parse: value => parse(value),
            serialize: value => turndown.turndown(value),
        };
    },
};

export default class U2Rte extends HTMLElement {
    #codec;
    #source;
    #observer;
    #form;
    #tabindex;
    #dirty = false;
    #writing = false;
    #version = 0;

    connectedCallback() {
        const textarea = this.querySelector(':scope > textarea:only-child');
        if (!textarea || this.children.length !== 1) {
            console.error('u2-rte requires exactly one direct textarea');
            return;
        }
        this.textarea = textarea;
        this.#init(++this.#version);
    }

    disconnectedCallback() {
        this.#version++;
        this.#dispose();
    }

    get language() { return this.getAttribute('language') || 'html'; }
    get value() { return this.textarea?.value ?? ''; }
    set value(value) {
        if (!this.textarea) return;
        this.textarea.value = String(value);
        if (this.#source) this.#write(this.textarea.value);
    }

    async #init(version) {
        const load = codecs[this.language];
        if (!load) {
            console.error(`u2-rte: Unsupported language: ${this.language}`);
            return;
        }
        try {
            const codec = await load();
            if (!this.isConnected || version !== this.#version) return;
            this.#codec = codec;
            this.editor = document.createElement('div');
            this.editor.contentEditable = 'true';
            this.editor.dataset.u2RteEditor = '';
            this.editor.role = 'textbox';
            this.editor.ariaMultiLine = 'true';
            this.append(this.editor);
            this.surface = editor.core.add(this.editor);
            this.#source = new Source(this.surface);
            this.#write(this.textarea.value);
            this.editor.addEventListener('input', this.#input);
            this.editor.addEventListener('focusout', this.#focusout);
            this.editor.addEventListener('u2-rte-change', this.#change);
            this.textarea.addEventListener('focus', this.#focus);
            this.textarea.addEventListener('invalid', this.#focus);
            this.#form = this.textarea.form;
            this.#form?.addEventListener('reset', this.#reset);
            this.#tabindex = this.textarea.getAttribute('tabindex');
            this.textarea.tabIndex = -1;
            this.#observer = new MutationObserver(this.#mutate);
            this.#observer.observe(this.editor, {subtree: true, childList: true, characterData: true, attributes: true});
            this.#observer.observe(this.textarea, {attributes: true});
            this.#state();
            this.dataset.ready = '';
        } catch (error) {
            this.#dispose();
            console.error('u2-rte:', error);
        }
    }

    #write(value) {
        this.#writing = true;
        try {
            this.#source.write(this.#codec.parse(value));
        } finally {
            this.#writing = false;
        }
        this.#sync();
    }

    #sync() {
        const html = this.#source.read().html;
        this.textarea.value = this.#codec.serialize(html);
    }

    #emitInput(event) {
        this.#sync();
        this.#dirty = true;
        this.textarea.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            composed: true,
            data: event?.data ?? null,
            inputType: event?.inputType || '',
        }));
    }

    #input = event => {
        event.stopPropagation();
        this.#emitInput(event);
    };

    #change = event => {
        if (this.#writing) return;
        this.#sync();
        if (event.detail.transaction.options.trigger !== 'input') this.#emitInput();
    };

    #focusout = () => queueMicrotask(() => {
        if (!this.#dirty || this.editor.matches(':focus-within')) return;
        this.#dirty = false;
        this.textarea.dispatchEvent(new Event('change', {bubbles: true}));
    });

    #focus = event => {
        event.preventDefault();
        this.editor.focus();
    };

    #reset = () => queueMicrotask(() => this.#write(this.textarea.value));

    #mutate = records => {
        if (records.some(record => record.target === this.textarea)) this.#state();
        if (records.some(record => record.target !== this.textarea)) this.#sync();
    };

    #state() {
        const inactive = this.textarea.disabled || this.textarea.readOnly;
        this.editor.contentEditable = inactive ? 'false' : 'true';
        this.editor.ariaDisabled = this.textarea.disabled ? 'true' : null;
        this.editor.ariaReadOnly = this.textarea.readOnly ? 'true' : null;
        this.editor.dataset.placeholder = this.textarea.placeholder;
        for (const name of ['dir', 'lang', 'spellcheck']) {
            const value = this.textarea.getAttribute(name);
            if (value === null) this.editor.removeAttribute(name);
            else this.editor.setAttribute(name, value);
        }
    }

    #dispose() {
        this.#observer?.disconnect();
        this.#form?.removeEventListener('reset', this.#reset);
        this.textarea?.removeEventListener('focus', this.#focus);
        this.textarea?.removeEventListener('invalid', this.#focus);
        this.editor?.removeEventListener('input', this.#input);
        this.editor?.removeEventListener('focusout', this.#focusout);
        this.editor?.removeEventListener('u2-rte-change', this.#change);
        this.surface?.dispose();
        this.editor?.remove();
        if (this.#tabindex === null) this.textarea?.removeAttribute('tabindex');
        else if (this.#tabindex !== undefined) this.textarea?.setAttribute('tabindex', this.#tabindex);
        this.removeAttribute('data-ready');
        this.#observer = null;
        this.#form = null;
        this.#source = null;
        this.#tabindex = undefined;
        this.#dirty = false;
        this.surface = null;
        this.editor = null;
    }
}

customElements.get('u2-rte') || customElements.define('u2-rte', U2Rte);
