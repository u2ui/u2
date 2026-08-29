export class Toolbar {
    #core;
    #element;
    #resolve;
    #place;
    #controller;
    #surfaceController = null;
    #surface = null;
    #commands = null;
    #connected = true;

    constructor(core, element, {commands, place = null} = {}) {
        if (!core?.root || typeof core?.addEventListener !== 'function') {
            throw new TypeError('A toolbar requires an editor core');
        }
        if (element?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('A toolbar requires an element');
        if (typeof commands !== 'function') throw new TypeError('A toolbar requires a command resolver');
        if (place !== null && typeof place !== 'function') throw new TypeError('Toolbar placement must be a function');
        const document = core.root.nodeType === Node.DOCUMENT_NODE ? core.root : core.root.ownerDocument;
        if (element.ownerDocument !== document) throw new RangeError('A toolbar must share its core document');
        this.#core = core;
        this.#element = element;
        this.#resolve = commands;
        this.#place = place;
        this.#controller = new document.defaultView.AbortController();
        const listen = {signal: this.#controller.signal};
        core.addEventListener('u2-rte-activechange', this.#activeChange, listen);
        core.addEventListener('u2-rte-dispose', this.#coreDispose, listen);
        element.addEventListener('pointerdown', this.#pointerDown, listen);
        element.addEventListener('click', this.#click, listen);
        core.root.addEventListener('keydown', this.#keyDown, listen);
        if (!element.hasAttribute('role')) element.setAttribute('role', 'toolbar');
        element.hidden = true;
        try {
            this.#activate(core.active);
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    get core() { return this.#core; }
    get element() { return this.#element; }
    get surface() { return this.#surface; }
    get commands() { return this.#commands; }
    get connected() { return this.#connected; }

    refresh() {
        if (!this.#connected) return false;
        const surface = this.#surface;
        const commands = surface?.connected ? this.#resolve(surface) : null;
        if (commands != null && !registry(commands)) throw new TypeError('Toolbar commands must resolve to a command registry');
        this.#commands = commands || null;
        const active = !!commands && surface.config.ui === 'roaming';
        const names = active ? configured(surface.element) : null;
        const detail = surface?.selection ? {range: surface.selection.range()} : undefined;
        let visible = 0;
        for (const item of this.#items()) {
            const name = item.dataset.command.trim();
            const show = active && commands.has(name) && (!names || names.has(name));
            item.hidden = !show;
            if (!show) {
                state(item, null, true);
                continue;
            }
            visible++;
            state(item, item.hasAttribute('data-state') ? commands.state(name, detail) : null,
                !commands.enabled(name, detail));
        }
        this.#element.hidden = !active || !visible;
        if (!this.#element.hidden) this.#place?.(this.#element, surface);
        return !this.#element.hidden;
    }

    dispose() {
        if (!this.#connected) return;
        this.#surfaceController?.abort();
        this.#controller.abort();
        this.#surfaceController = null;
        this.#surface = null;
        this.#commands = null;
        this.#element.hidden = true;
        this.#connected = false;
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    #activate(surface) {
        if (surface === this.#surface) {
            this.refresh();
            return;
        }
        this.#surfaceController?.abort();
        this.#surface = surface || null;
        this.#surfaceController = null;
        if (surface) {
            const Controller = this.#element.ownerDocument.defaultView.AbortController;
            this.#surfaceController = new Controller();
            const listen = {signal: this.#surfaceController.signal};
            surface.addEventListener('u2-rte-selectionchange', this.#refresh, listen);
            surface.addEventListener('u2-rte-change', this.#refresh, listen);
            surface.addEventListener('u2-rte-disconnect', this.#disconnect, listen);
        }
        this.refresh();
    }

    #items() {
        return this.#element.querySelectorAll('[data-command]');
    }

    #item(target) {
        const item = target?.closest?.('[data-command]');
        if (!item || !this.#element.contains(item) || item.hidden || item.getAttribute('aria-disabled') === 'true') return null;
        const name = item.dataset.command.trim();
        return this.#commands?.has(name) ? item : null;
    }

    #run(item) {
        if (!this.#surface.capture()) this.#surface.restore();
        this.#commands.run(item.dataset.command.trim());
        this.refresh();
    }

    #activeChange = event => this.#activate(event.detail.surface);
    #coreDispose = () => this.dispose();
    #disconnect = () => this.#activate(null);
    #refresh = () => this.refresh();

    #pointerDown = event => {
        if (this.#item(event.target)) event.preventDefault();
    };

    #click = event => {
        const item = this.#item(event.target);
        if (!item) return;
        event.preventDefault();
        this.#run(item);
    };

    #keyDown = event => {
        if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.shiftKey || !this.#surface) return;
        const target = event.composedPath()[0];
        if (target !== this.#surface.element && !this.#surface.element.contains(target)) return;
        const key = event.key.toLowerCase();
        const item = [...this.#items()].find(item => item.dataset.shortcut?.toLowerCase() === key && this.#item(item));
        if (!item) return;
        event.preventDefault();
        this.#run(item);
    };
}

function registry(value) {
    return typeof value?.has === 'function'
        && typeof value?.enabled === 'function'
        && typeof value?.state === 'function'
        && typeof value?.run === 'function';
}

function configured(element) {
    const value = getComputedStyle(element).getPropertyValue('--u2-rte-toolbar').trim();
    return value ? new Set(value.split(/[\s,]+/).filter(Boolean)) : null;
}

function state(item, value, disabled) {
    if ('disabled' in item) item.disabled = disabled;
    item.setAttribute('aria-disabled', String(disabled));
    if (value === true || value === false || value === 'mixed') item.setAttribute('aria-pressed', String(value));
    else item.removeAttribute('aria-pressed');
}
