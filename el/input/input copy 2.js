// Type-Handler mit Lifecycle
class TypeHandler {
    constructor(element, shadow) {
        this.element = element;
        this.shadow = shadow;
        this.realInput = element.realInput;
    }

    get fallback() { return '<input type=text>'; }
    get input() { return '<slot name=start></slot><slot></slot><slot name=end></slot>'; }
    get css() { return ''; }

    init() { } // wird nach DOM-Aufbau aufgerufen
    cleanup() { } // wird vor Type-Wechsel aufgerufen
}

// Concrete Handlers
class TextHandler extends TypeHandler {
    get fallback() { return '<input type=text>'; }
}

class TextareaHandler extends TypeHandler {
    get fallback() { return '<textarea></textarea>'; }
}

class SelectHandler extends TypeHandler {
    get fallback() { return '<select></select>'; }

    init() {
        const listId = this.element.getAttribute('list');
        if (!listId) return;

        const list = document.getElementById(listId);
        if (!list) return;

        list.querySelectorAll('option').forEach(opt => {
            const clone = document.createElement('option');
            clone.value = opt.value;
            clone.textContent = opt.textContent;
            this.realInput.appendChild(clone);
        });
    }
}

class StepperHandler extends TypeHandler {
    get fallback() { return '<input type=number>'; }
    get input() {
        return `
      <slot name=start></slot>
      <button class=down><u2-ico icon=minus inline>-</u2-ico></button>
      <slot></slot>
      <button class=up><u2-ico icon=plus inline>+</u2-ico></button>
      <slot name=end></slot>`;
    }
    get css() {
        return `::slotted(input) { appearance: textfield; }`;
    }

    init() {
        const triggerInput = () => this.realInput.dispatchEvent(new Event('input', { bubbles: true }));

        this.upHandler = () => {
            this.realInput.stepUp();
            triggerInput();
        };
        this.downHandler = () => {
            this.realInput.stepDown();
            triggerInput();
        };

        this.shadow.querySelector('.up').addEventListener('click', this.upHandler);
        this.shadow.querySelector('.down').addEventListener('click', this.downHandler);
    }

    cleanup() {
        this.shadow.querySelector('.up')?.removeEventListener('click', this.upHandler);
        this.shadow.querySelector('.down')?.removeEventListener('click', this.downHandler);
    }
}

class PasswordHandler extends TypeHandler {
    get fallback() { return '<input type=password>'; }
    get input() {
        return `
      <slot name=start></slot>
      <slot></slot>
      <slot name=end></slot>
      <button part="visibility" tabindex=-1>
        <u2-ico inline icon=visibility_off></u2-ico>
      </button>`;
    }

    init() {
        this.visibilityBtn = this.shadow.querySelector('button[part~=visibility]');
        this.toggleHandler = () => this.toggleVisibility();
        this.visibilityBtn.addEventListener('click', this.toggleHandler);
    }

    toggleVisibility() {
        clearTimeout(this.timer);
        const visible = this.realInput.type === 'text';
        const type = visible ? 'password' : 'text';
        const icon = visible ? 'visibility' : 'visibility_off';

        this.visibilityBtn.ariaLabel = visible ? 'hide password' : 'show password';
        this.visibilityBtn.querySelector('u2-ico').setAttribute('icon', icon);
        this.realInput.type = type;

        if (!visible) {
            this.timer = setTimeout(() => this.toggleVisibility(), 20000);
        }
    }

    cleanup() {
        clearTimeout(this.timer);
        this.visibilityBtn?.removeEventListener('click', this.toggleHandler);
    }
}

class CheckboxHandler extends TypeHandler {
    get fallback() { return '<select><option value="">off</option><option>on</option></select>'; }
    get input() {
        return `
      <slot name=start></slot>
      <input type=checkbox id=checkbox>
      <slot name=end></slot>`;
    }
    get css() {
        return `
      :host {
        inline-size: auto;
        height: 1.6em;
        aspect-ratio: 1;
        border: 0;
        overflow: visible;
      }
      #input { border: 0; position: relative; }
      #checkbox { position: absolute; inset: 0; margin: 0; }`;
    }

    init() {
        setTimeout(() => {
            const checkbox = this.shadow.querySelector('#checkbox');
            const on = this.element.getAttribute('on') ?? 'on';
            const off = this.element.getAttribute('off') ?? '';

            if (this.element.fallbackActive) {
                this.realInput.lastElementChild.value = on;
                this.realInput.firstElementChild.value = off;
                this.realInput.value = this.element.hasAttribute('checked') ? on : off;
            }

            this.changeHandler = () => {
                this.realInput.value = checkbox.checked ?
                    this.realInput.lastElementChild.value :
                    this.realInput.firstElementChild.value;
                this.element._updateOwnFormValue();
            };

            checkbox.addEventListener('change', this.changeHandler);
            checkbox.checked = this.realInput.value === this.realInput.lastElementChild.value;
            this.element._updateOwnFormValue();
        });
    }

    cleanup() {
        const checkbox = this.shadow.querySelector('#checkbox');
        checkbox?.removeEventListener('change', this.changeHandler);
    }
}

class RangeHandler extends TypeHandler {
    get fallback() { return '<input type=range>'; }
    get css() {
        return `:host { border: 0 !important; overflow: visible; }`;
    }
}

class DateHandler extends TypeHandler {
    get fallback() { return '<input type=date>'; }
    get input() { return '<slot></slot>'; }
}

class CycleHandler extends TypeHandler {
    get fallback() { return ''; }
    get input() { return '<slot style="display:grid;"></slot>'; }
}

class FileHandler extends TypeHandler {
    get fallback() { return '<input type=file multiple>'; }
    get input() {
        return `
      <div id=droparea>
        <button id=browse>
          Durchsuchen...
          <small id=num class=u2-badge></small>
        </button>
        <div id=preview>
          <table id=previewTable></table>
        </div>
      </div>`;
    }
    get css() {
        return `
      @import url('${import.meta.resolve('../../class/badge/badge.css')}');
      :host { vertical-align: top; }
      #droparea {
        flex: 1 1 auto;
        position: relative;
        padding: .2em;
        display: grid;
        place-items: center;
      }
      #browse {
        font: inherit;
      }
      #num {
        background: var(--color-light, #eee);
        color: inherit;
        font-size: .7em;
        vertical-align: 16%;
      }
      #num:empty { display: none; }
      #preview {
        white-space: nowrap;
        overflow: auto;
        font-size: 12px;
        width: 100%;
        max-height: 10em;
      }
      #previewTable {
        flex-wrap: wrap;
        gap: .2em;
        width: 100%;
        max-height: 10em;
      }
      #preview img {
        display: block;
        margin: auto;
        max-width: 30px;
        max-height: 30px;
        object-fit: contain;
        transition: .2s;
      }
      #preview img:hover {
        z-index: 1;
        scale: 2;
      }`;
    }

    init() {
        import('../bytes/bytes.js');

        const browse = this.shadow.getElementById('browse');

        this.changeHandler = () => this.showPreview();
        this.browseHandler = () => this.realInput.click();
        this.dragoverHandler = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.element.classList.add('u2DragOver');
        };
        this.dragleaveHandler = () => this.element.classList.remove('u2DragOver');
        this.dropHandler = (e) => {
            e.preventDefault();
            this.addFiles(e.dataTransfer.files);
            this.element.classList.remove('u2DragOver');
        };
        this.pasteHandler = (e) => this.addFiles(e.clipboardData.files);

        this.realInput.addEventListener('change', this.changeHandler);
        browse.addEventListener('click', this.browseHandler);
        this.element.addEventListener('dragover', this.dragoverHandler);
        this.element.addEventListener('dragleave', this.dragleaveHandler);
        this.element.addEventListener('drop', this.dropHandler);
        this.element.addEventListener('paste', this.pasteHandler);
        this.element.setPicker(this.element.$('#preview'));

    }

    addFiles(files) {
        const list = new DataTransfer();
        for (let file of files) list.items.add(file);
        for (let item of this.realInput.files) list.items.add(item);
        this.realInput.files = list.files;
        this.showPreview();
    }

    showPreview() {
        const preview = this.shadow.querySelector('#previewTable');
        preview.innerHTML = '';

        for (let file of this.realInput.files) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td width=9 class=img></td>
        <td><div style="overflow:hidden;text-overflow:ellipsis;">${file.name}</div></td>
        <td width=9><u2-bytes>${file.size}</u2-bytes></td>
        <td width=9><button class=remove style="all:unset; padding-inline-start:.4em; cursor:pointer">✖</button></td>`;

            tr.querySelector('.remove').addEventListener('click', () => {
                const list = new DataTransfer();
                for (let item of this.realInput.files) {
                    if (item !== file) list.items.add(item);
                }
                this.realInput.files = list.files;
                this.showPreview();
            });

            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.alt = file.name;
                img.onload = () => URL.revokeObjectURL(img.src);
                tr.querySelector('.img').appendChild(img);
            }

            preview.appendChild(tr);
        }

        this.shadow.getElementById('num').textContent = this.realInput.files.length || '';
    }

    cleanup() {
        this.realInput?.removeEventListener('change', this.changeHandler);
        this.shadow.getElementById('browse')?.removeEventListener('click', this.browseHandler);
        this.element.removeEventListener('dragover', this.dragoverHandler);
        this.element.removeEventListener('dragleave', this.dragleaveHandler);
        this.element.removeEventListener('drop', this.dropHandler);
        this.element.removeEventListener('paste', this.pasteHandler);
    }
}

// Type Registry
const TYPE_REGISTRY = {
    text: TextHandler,
    textarea: TextareaHandler,
    select: SelectHandler,
    stepper: StepperHandler,
    password: PasswordHandler,
    checkbox: CheckboxHandler,
    range: RangeHandler,
    date: DateHandler,
    cycle: CycleHandler,
    file: FileHandler,
};

// Custom Element
customElements.define('u2-input', class extends HTMLElement {
    constructor() {
        super();
        import('../ico/ico.js');

        const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
        shadow.innerHTML = `
      <style>
        @import url('${import.meta.resolve('../ico/ico.css')}');
        
        :host {
          display: inline-block;
          inline-size: 13em;
          padding: 0 !important;
          overflow: clip;
        }
        #input {
          display: flex;
          align-items: baseline;
          block-size: 100%;
          --u2-ico-dir: var(--u2-ico-dir-material);
        }
        
        [name=start]::slotted(*) { margin-inline-start: .5em; }
        [name=end]::slotted(*) { margin-inline-end: .5em; }
        
        ::slotted(input), ::slotted(textarea), ::slotted(select) {
          margin: 0 !important;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          flex: 1 1 auto;
          inline-size: auto;
          block-size: 100% !important;
        }
        ::slotted(input) { inline-size: 100% !important; }
        
        #input > button {
          background: var(--color-light, #eee);
          align-self: stretch;
          min-inline-size: 2em;
          transition: .2s;
          opacity: 0;
          border: 0;
        }
        #input > button:active, 
        #input > button:focus, 
        #input > button:hover {
          background: #e9e9e9;
          outline: 0;
          opacity: 1;
        }
        :host(:hover) #input > button { opacity: 1; }

        #picker-trigger {
            opacity: 1;
        }        
      </style>
      <style id=typeCss></style>
      <div id=input>
        <slot name=start></slot>
        <slot></slot>
        <slot name=end></slot>
      </div>`;

        this._internals = this.attachInternals();
        this._currentHandler = null;

        this.addEventListener('input', e => {
            if (e.target === this) return;
            this._updateOwnFormValue();
            this.hasAttribute('name') && this.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    connectedCallback() {
        this.realInput = this.querySelector('input,textarea,select');
        if (this.realInput) this._updateOwnFormValue();
    }

    disconnectedCallback() {
        this._currentHandler?.cleanup();
        this._picker?.btn.remove();
    }

    get type() {
        if (this.hasAttribute('type')) return this.getAttribute('type');
        if (this.realInput) {
            if (this.realInput.tagName === 'TEXTAREA') return 'textarea';
            if (this.realInput.tagName === 'SELECT') return 'select';
            return this.realInput.type;
        }
        return 'text';
    }

    _updateOwnFormValue() {
        const inputs = [...this.querySelectorAll('input,textarea,select,button')];
        const value = inputs.map(i => i.value).join('');
        this._internals.setFormValue(value);
    }

    _updateType(type) {
        // Cleanup alter Handler
        this._currentHandler?.cleanup();

        // Fallback-Content entfernen wenn vorhanden
        const mainSlot = this.shadowRoot.querySelector('slot:not([name])');
        if (this.fallbackActive) {
            mainSlot.assignedNodes().forEach(node => node.remove());
            this.fallbackActive = false;
        }

        // Fallback erstellen wenn kein Content vorhanden
        const HandlerClass = TYPE_REGISTRY[type] ?? TextHandler;
        if (!mainSlot.assignedElements().length) {
            const handler = new HandlerClass(this, this.shadowRoot);
            this.innerHTML += handler.fallback;
            this.fallbackActive = true;
        }

        this.realInput = this.querySelector('input,textarea,select');
        this._updateOwnFormValue();

        // Handler initialisieren
        this._currentHandler = new HandlerClass(this, this.shadowRoot);
        this.shadowRoot.getElementById('input').innerHTML = this._currentHandler.input;
        this.shadowRoot.getElementById('typeCss').textContent = this._currentHandler.css;

        setTimeout(() => this._currentHandler.init());
    }

    static formAssociated = true;
    static observedAttributes = ['type', 'value'];

    attributeChangedCallback(name, old, val) {
        if (old === val) return;

        if (name === 'type') {
            this._updateType(val);
        } else if (name === 'value') {
            if (this.realInput) this.realInput.defaultValue = val;
        }
    }

    formStateRestoreCallback(state) {
        if (this.realInput) this.realInput.value = state;
    }

    get form() { return this._internals.form; }
    get value() { return this.realInput?.value; }
    set value(v) { if (this.realInput) this.realInput.value = v; }

    // API für eigene Type-Handler
    static registerType(name, HandlerClass) {
        TYPE_REGISTRY[name] = HandlerClass;
    }

    // Picker API (analog zu showPicker())
    setPicker(element, options = {}) {
        this._removePicker();

        const { icon = 'arrow-drop-down' } = options;

        element.popover = 'manual';
        element.id ||= `picker-${Math.random().toString(36).slice(2)}`;

        const btn = document.createElement('button');
        btn.id = 'picker-trigger';
        btn.type = 'button';
        btn.ariaHasPopup = 'true';
        btn.ariaControls = element.id;
        btn.innerHTML = `<u2-ico icon="${icon}" inline></u2-ico>`;

        btn.onclick = () => this._picker.element.matches(':popover-open') ? this._hidePicker() : this._showPicker();

        this.realInput.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); this._showPicker(); }
            if (e.key === 'Escape') { e.preventDefault(); this._hidePicker(); }
        });
        this.addEventListener('focusout', e => {
            if (!this.contains(e.relatedTarget) && !element.contains(e.relatedTarget)) {
                this._hidePicker();
            }
        });

        this.$('#input').append(btn);

        if (!element.parentElement) this.shadowRoot.appendChild(element);

        this._picker = { element, btn };
        return this;
    }

    _removePicker() {
        this._picker?.btn.remove();
        this._picker = null;
    }

    async _showPicker() {
        if (!this._picker) return;

        this._picker.element.showPopover();
        this._picker.btn.ariaExpanded = 'true';

        const { Placer } = await import('../../js/Placer/Placer.js');
        new Placer(element, { x: 'prepend', y: 'after', margin: 0 }).toElement(this);
        element.style.minWidth = this.offsetWidth + 'px';
        element.style.maxWidth = '50vw';
    }

    _hidePicker() {
        if (!this._picker?.element.matches(':popover-open')) return;
        this._picker.element.hidePopover();
        this._picker.btn.ariaExpanded = 'false';
    }

    // Helper
    $(selector) { return this.shadowRoot.querySelector(selector); }

});

// Globales File-Drag-Feedback
document.addEventListener('dragenter', e => {
    if (e.relatedTarget != null) return;
    const hasFile = [...e.dataTransfer.items].some(item => item.kind === 'file');
    if (hasFile) document.documentElement.classList.add('u2DraggingFile');
});
document.addEventListener('dragleave', e => {
    if (e.relatedTarget != null) return;
    document.documentElement.classList.remove('u2DraggingFile');
});
document.addEventListener('drop', () => {
    document.documentElement.classList.remove('u2DraggingFile');
});