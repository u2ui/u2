export class Toolbar {
    #core;
    #element;
    #resolve;
    #place;
    #hovered = false;
    #controller;
    #surfaceController = null;
    #surface = null;
    #commands = null;
    #connected = true;
    #ordered = null;

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
        // A toolbar that moves out from under the pointer is a toolbar you
        // cannot click. While it is being aimed at, it stays where it is and
        // catches up when the pointer goes.
        element.addEventListener('pointerenter', () => { this.#hovered = true; }, listen);
        element.addEventListener('pointerleave', () => {
            this.#hovered = false;
            if (!this.#element.hidden && this.#surface) this.#place?.(this.#element, this.#surface);
        }, listen);
        element.addEventListener('click', this.#click, listen);
        element.addEventListener('change', this.#change, listen);
        if (!element.hasAttribute('role')) element.setAttribute('role', 'toolbar');
        element.hidden = true;
        // Focus landing in a control is still the editor's: without this the core
        // would end the session the moment a button took the focus.
        core.retain(element);
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
        surface?.invalidate(); // whatever a host declared may have changed since the last one
        const commands = surface?.connected ? this.#resolve(surface) : null;
        if (commands != null && !registry(commands)) throw new TypeError('Toolbar commands must resolve to a command registry');
        this.#commands = commands || null;
        // One computed style for the settings only this toolbar reads: asking for
        // it three times is three style resolutions on a path every keystroke
        // goes down. The shared ones keep coming from the surface, defaults and
        // validation included.
        const style = commands && getComputedStyle(surface.element);
        const active = !!commands && surface.config.ui === 'roaming' && visibleForSelection(surface, style);
        const names = active ? configured(style) : null;
        this.#order(names);
        // A host may prefer a toolbar that only ever shows what it can do, at
        // the cost of a shape that moves with the caret.
        const hiding = active && setting(style, 'toolbar-unavailable') === 'hide';
        const detail = surface?.selection ? {range: surface.selection.range()} : undefined;
        let visible = 0;
        for (const item of this.#items()) {
            const name = item.dataset.command.trim();
            const control = item.dataset.control?.trim() || name;
            const offered = active && commands.has(name) && (!names || names.includes(control));
            const disabled = !offered || !commands.enabled(name, detail);
            item.hidden = !offered || hiding && disabled;
            if (item.hidden) {
                state(item, null, true);
                continue;
            }
            visible++;
            state(item, item.hasAttribute('data-state') ? commands.state(name, detail) : null, disabled);
        }
        // A menu button offers what its entries do: present when the command is, available while at
        // least one entry is, and each entry marked with the value its set currently carries.
        for (const button of this.#element.querySelectorAll('button[data-command-menu]')) {
            const command = button.dataset.commandMenu.trim();
            const control = button.dataset.control?.trim() || command;
            const show = active && commands.has(command) && (!names || names.includes(control));
            const panel = this.#element.querySelector(`[data-menu="${command}"]`);
            let usable = 0;
            for (const entry of panel?.querySelectorAll('button[data-value]') ?? []) {
                const value = entry.dataset.value;
                const on = show && commands.state(command, {...detail, value}) === value;
                // What is already set stays in the list, marked: an entry the selection carries has
                // nothing left to apply, and hiding it would take the answer away with the question.
                const enabled = on || show && commands.enabled(command, {...detail, value});
                entry.disabled = !enabled;
                entry.hidden = !enabled;
                entry.setAttribute('aria-pressed', String(on));
                if (enabled) usable++;
            }
            const offered = show && !!panel?.querySelector('button[data-value]');
            button.hidden = !offered || hiding && !usable;
            state(button, null, !usable);
            if (button.hidden && panel) panel.hidden = true;
            else visible++;
        }
        for (const select of this.#values()) {
            const command = select.dataset.commandValue.trim();
            const control = select.dataset.control?.trim() || command;
            const show = active && commands.has(command) && (!names || names.includes(control));
            let choices = 0;
            for (const option of select.options) {
                if (!option.value) continue;
                const enabled = show && commands.enabled(command, {...detail, value: option.value});
                option.hidden = !enabled;
                option.disabled = !enabled;
                if (enabled) choices++;
            }
            // Presence answers what this editor offers, availability what the
            // selection allows. A select with no configured choice at all is
            // absent; one whose choices simply do not apply here stays and is
            // disabled, so the toolbar keeps its shape as the caret moves.
            const offered = show && [...select.options].some(option => option.value);
            const usable = offered && choices > 0;
            const value = usable ? commands.state(command, detail) : null;
            select.hidden = !offered || hiding && !usable;
            select.disabled = !usable;
            select.setAttribute('aria-disabled', String(!usable));
            const selected = [...select.options].find(option => option.value === value && !option.disabled);
            select.value = selected && value !== 'mixed' ? value : '';
            if (!select.hidden) visible++;
        }
        const show = active && !!visible;
        // Appearing is not moving: a toolbar that becomes visible must not slide
        // in from wherever it last stood, so the first placement is made with
        // any transition suppressed.
        const appearing = show && this.#element.hidden;
        display(this.#element, show);
        if (show && !(this.#hovered && !appearing)) {
            if (appearing) this.#element.dataset.placing = '';
            this.#place?.(this.#element, surface);
            if (appearing) {
                const view = this.#element.ownerDocument.defaultView;
                view.requestAnimationFrame(() => delete this.#element.dataset.placing);
            }
        }
        return show;
    }

    dispose() {
        if (!this.#connected) return;
        this.#core.release(this.#element);
        this.#surfaceController?.abort();
        this.#controller.abort();
        this.#surfaceController = null;
        this.#surface = null;
        this.#commands = null;
        display(this.#element, false);
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
            surface.addEventListener('u2-rte-history', this.#refresh, listen);
            surface.addEventListener('u2-rte-disconnect', this.#disconnect, listen);
        }
        this.refresh();
    }

    // The declaration is the order, not only the choice: a host says what its toolbar looks like,
    // and what it does not name keeps the order its modules were registered in, behind the rest.
    // Only a changed declaration moves anything — this runs on every refresh.
    #order(names) {
        const key = names?.join(' ') ?? '';
        if (this.#ordered === key) return;
        this.#ordered = key;
        if (!names) return;
        for (const name of [...names].reverse()) {
            const control = this.#element.querySelector(`[data-control="${name}"]`);
            const panel = control?.nextElementSibling?.hasAttribute('data-menu') ? control.nextElementSibling : null;
            if (control) this.#element.prepend(control, ...(panel ? [panel] : []));
        }
    }

    #items() {
        return this.#element.querySelectorAll('[data-command]');
    }

    #values() {
        return this.#element.querySelectorAll('select[data-command-value]');
    }

    #item(target) {
        const item = target?.closest?.('[data-command]');
        if (!item || !this.#element.contains(item) || item.hidden || item.getAttribute('aria-disabled') === 'true') return null;
        const name = item.dataset.command.trim();
        return this.#commands?.has(name) ? item : null;
    }

    #run(name, detail) {
        if (!this.#surface.capture()) this.#surface.restore();
        this.#commands.run(name, detail);
        this.refresh();
    }

    #activeChange = event => this.#activate(event.detail.surface);
    #coreDispose = () => this.dispose();
    #disconnect = () => this.#activate(null);
    #refresh = () => this.refresh();

    // The toolbar is chrome: pointing at it must never move the editor's
    // selection, not even at a control that currently has nothing to run.
    // Fields keep their own pointer behaviour so they can be opened and typed in.
    #pointerDown = event => {
        const target = event.composedPath()[0];
        // Fields keep their own pointer behaviour so they can be opened and typed in — but only
        // while they can take the focus. A disabled one would send it nowhere, and a session ends
        // where its focus went.
        const field = target?.closest?.('select, input, textarea');
        if (field && !field.disabled) return;
        event.preventDefault();
    };

    #click = event => {
        // A menu entry sets a value the way a select does; the menu stays open, so a second set can
        // be picked without opening it again.
        const entry = event.target?.closest?.('button[data-command-value][data-value]');
        if (entry && this.#element.contains(entry) && !entry.disabled) {
            event.preventDefault();
            this.#run(entry.dataset.commandValue.trim(), {value: entry.dataset.value});
            return;
        }
        const item = this.#item(event.target);
        if (!item) return;
        event.preventDefault();
        this.#run(item.dataset.command.trim());
    };

    #change = event => {
        const select = event.target?.closest?.('select[data-command-value]');
        if (!select || !this.#element.contains(select) || select.hidden || select.disabled) return;
        const name = select.value.trim();
        const command = select.dataset.commandValue.trim();
        if (!name || select.selectedOptions[0]?.disabled || !this.#commands?.has(command)) {
            this.refresh();
            return;
        }
        this.#run(command, {value: name});
    };
}

function registry(value) {
    return typeof value?.has === 'function'
        && typeof value?.enabled === 'function'
        && typeof value?.state === 'function'
        && typeof value?.run === 'function';
}

function setting(style, name) {
    return style.getPropertyValue(`--u2-rte-${name}`).trim();
}

function configured(style) {
    const value = setting(style, 'toolbar');
    return value ? [...new Set(value.split(/[\s,]+/).filter(Boolean))] : null;
}

function visibleForSelection(surface, style) {
    return setting(style, 'toolbar-when') !== 'selection'
        || !!surface.selection && !surface.selection.collapsed;
}

function state(item, value, disabled) {
    if ('disabled' in item) item.disabled = disabled;
    item.setAttribute('aria-disabled', String(disabled));
    if (value === true || value === false || value === 'mixed') item.setAttribute('aria-pressed', String(value));
    else item.removeAttribute('aria-pressed');
}

// Hidden before it leaves the top layer, shown after it enters: the two attributes hide the same
// element, and `togglePopover(force)` says which state is wanted rather than asking for the current.
function display(element, visible) {
    const popover = element.hasAttribute('popover') && typeof element.togglePopover === 'function';
    if (!visible && popover) element.togglePopover(false);
    element.hidden = !visible;
    if (visible && popover) element.togglePopover(true);
}
