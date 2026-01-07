// See https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel


const types = {
    text: {
        fallback: '<input type=text>',
        input: `<slot name=start></slot><slot></slot><slot name=end></slot>`,
    },
    textarea: {
        fallback: '<textarea></textarea>',
        input: `<slot name=start></slot><slot></slot><slot name=end></slot>`,
    },
    select: {
        fallback: '<select></select>',
        input: `<slot name=start></slot><slot></slot><slot name=end></slot>`,
        init({shadow}) {
            const listId = this.getAttribute('list');
            if (listId) {
                const list = document.getElementById(listId);
                if (list) {
                    const options = list.querySelectorAll('option');
                    options.forEach(option => {
                        const opt = document.createElement('option');
                        opt.value = option.value;
                        opt.textContent = option.textContent;
                        this.realInput.appendChild(opt);
                    });
                }
            }
        }
    },
    range: {
        fallback: '<input type=range>',
        input: `<slot name=start></slot><slot></slot><slot name=end></slot>`,
        css: `
            :host {
                border:0 !important;
                overflow:visible;
            }
            `,
    },
    stepper: {
        fallback: '<input type=number>',
        input: `
            <slot name=start></slot>
            <button class=down><u2-ico icon=minus inline>-</u2-ico></button>
            <slot></slot>
            <button class=up><u2-ico icon=plus inline>+</u2-ico></button>
            <slot name=end></slot>`,
        css: `
            ::slotted(input) {
                appearance:textfield;
            }
            `,
        init({shadow}) {
            const triggerInput = ()=> this.realInput.dispatchEvent(new Event('input', {bubbles: true}));
            shadow.querySelector('.up').addEventListener('click', ()=> {
                this.realInput.stepUp();
                triggerInput();
            });
            shadow.querySelector('.down').addEventListener('click', ()=> {
                this.realInput.stepDown();
                triggerInput();
            });
        }
    },
    password: {
        fallback: '<input type=password>',
        input: `
            <slot name=start></slot>
            <slot></slot>
            <slot name=end>
            </slot>
            <button part="visibility" tabindex=-1>
                <u2-ico inline icon=visibility_off></u2-ico>
            </button>
            `,
        init({shadow}) {
            const real = this.realInput;
            const visibilityBtn = shadow.querySelector('button[part~=visibility]');
            visibilityBtn.addEventListener('click', toggleVisibility);

            function toggleVisibility() {
                clearTimeout(toggleVisibility.timer);
                const visible = real.type === 'text';
                const type = visible ? 'password' : 'text';
                const icon = visible ? 'visibility' : 'visibility_off';
                const ariaLabel = visible ? 'hide password' : 'show password';
                visibilityBtn.ariaLabel = ariaLabel;
                visibilityBtn.querySelector('u2-ico').setAttribute('icon', icon);
                real.type = type;
                if (!visible) {
                    toggleVisibility.timer = setTimeout(() => { // todo: better activity detection
                        toggleVisibility();
                    }, 20000);
                }
            }
        }
    },
    checkbox: {
        fallback: '<select><option value="">off</option><option>on</select>',
        input: `
            <slot name=start></slot>
            <input type=checkbox id=checkbox>
            <slot name=end></slot>`,
        css: `
            :host {
                inline-size:auto;
                height:1.6em;
                aspect-ratio:1;
                border:0;
                border-radius:0;
                overflow:visible;
            }
            #input { border:0; border-radius:0; position:relative; }
            #checkbox {
                position:absolute;
                inset:0;
                margin:0;                
            }
        `,
        init({shadow}) {
            setTimeout(()=> {
                const real = this.realInput;
                const checkbox = shadow.querySelector('#checkbox');
                if (this.fallbackActive) {
                    const on = this.getAttribute('on') ?? 'on';
                    const off = this.getAttribute('off') ?? '';
                    const checked = this.getAttribute('checked') ?? false;
                    real.lastElementChild.setAttribute('value', off);
                    real.firstElementChild.setAttribute('value', on);
                    real.value = checked ? on : off;
                }
                checkbox.addEventListener('change', e => {
                    real.value = checkbox.checked ? real.lastElementChild.value : real.firstElementChild.value;
                    this._updateOwnFormValue();
                });
                checkbox.checked = real.value === real.lastElementChild.value;
                this._updateOwnFormValue();
            });
        }
    },
    date: {
        fallback: '<input type=date>',
        input: '<slot></slot>',
    },
    cycle: {
        fallback: '',
        input: `
        <slot style="display:grid;"></slot>`,
    },
    file: {
        fallback: '<input type=file multiple>',
        input: `
            <div id=droparea>
                <button id=browse>
                    Durchsuchen...
                    <small id=num class=u2-badge></small>
                </button>
                <div id=preview>
                    <table id=previewTable></table>
                </div>
            </div>
            `,
        css: `
            @import url('${import.meta.resolve('../../class/badge/badge.css')}');
            :host {
                vertical-align: top;
            }
            #droparea {
                flex:1 1 auto;
                position:relative;
                padding:.2em;
                display:grid;
                place-items:center;
            }
            #browse {
                font:inherit;
                #num {
                    background:var(--color-light,#eee);
                    color:inherit;
                    font-size:.7em;
                    vertical-align: 16%;
                    &:empty {
                        display:none;
                    }
                }
            }
            #preview {
                white-space:nowrap;
                overflow:auto;
                font-size:12px;
                width:100%;
                max-height: 10em;
            }
            #previewTable {
                flex-wrap:wrap;
                gap:.2em;
                flex-wrap:wrap;
                width:100%;
                max-height:10em;
            }
            #preview img {
                display:block;
                margin:auto;
                max-width:30px;
                max-height:30px;
                object-fit:contain;
                object-position:center;
                transition:.2s;
                &:hover {
                    z-index:1;
                    scale:2;
                }
            }
            `,
        init({shadow}) {
            import ('../bytes/bytes.js');
            const real = this.realInput;
            real.addEventListener('change', e => showPreview());
            shadow.getElementById('browse').addEventListener('click', e => real.click());
            this.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                this.classList.add('u2DragOver');
            });
            this.addEventListener('dragleave', e => this.classList.remove('u2DragOver'));
            this.addEventListener('drop', e => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
                this.classList.remove('u2DragOver');
            });
            this.addEventListener('paste', e => addFiles(e.clipboardData.files));
            function addFiles(files) {
                let list = new DataTransfer();
                for (let file of files) list.items.add(file);
                for (let item of real.files) list.items.add(item);
                real.files = list.files; // todo: trigger input/change events
                showPreview();
            }
            function showPreview() {
                const preview = shadow.querySelector('#previewTable');
                preview.innerHTML = '';
                for (let file of real.files) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td width=9 class=img></td>
                        <td><div style="overflow:hidden;text-overflow:ellipsis;">${file.name}</div></td>
                        <td width=9><u2-bytes>${file.size}</u2-bytes>
                        <td width=9><button class=remove style="all:unset; padding-inline-start:.4em; cursor:pointer">✖</button>
                    `;
                    tr.querySelector('.remove').addEventListener('click', () => { // remove
                        let list = new DataTransfer();
                        for (let item of real.files) if (item !== file) list.items.add(item);
                        real.files = list.files; // todo: trigger input/change events
                        showPreview();
                    });
                    if (file.type.startsWith('image/')) { // preview
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(file);
                        img.alt = file.name;
                        img.onload = e => URL.revokeObjectURL(img.src);
                        tr.querySelector('.img').appendChild(img);
                    }
                    preview.appendChild(tr);
                }
                shadow.getElementById('num').textContent = real.files.length;
            }
        }
    },
}

customElements.define('u2-input', class extends HTMLElement {
    constructor(...args) {
        super(...args);
        import('../ico/ico.js');

        let shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true });

        shadowRoot.innerHTML = `
        <style>
        @import url('${import.meta.resolve('../ico/ico.css')}');

        :host {
            display:inline-block;
            inline-size:13em;
            padding:0 !important;
            overflow:clip;
        }
        #input {
            display: flex;
            align-items: baseline;
            block-size:100%;
            --u2-ico-dir: var(--u2-ico-dir-material);
        }

        [name=start]::slotted(*) { margin-inline-start: .5em; }
        [name=end]::slotted(*) { margin-inline-end: .5em; }

        ::slotted(input), ::slotted(textarea), ::slotted(select) {
            margin: 0 !important;
            border: 0 !important;
            outline: 0 !important;
            box-shadow:none !important;
            flex:1 1 auto;
            inline-size:auto;
            block-size:100% !important;
        }
        ::slotted(input) {
            inline-size:100% !important;
        }        

        #input > button {
            background:var(--color-light, #eee);
            align-self:stretch;
            min-inline-size:2em;
            transition:.2s;
            opacity:0;
            &:active, &:focus, &:hover {
                background: #e9e9e9;
                outline:0;
                opacity:1;
            }
            :host(:hover) & { opacity:1; }
        }

        button {
            border: 0;
            background-color: transparent;
        }
        /* #input::before, #input::after { dirty baseline hack, needed?
            content:'p';
            width:0;
            overflow:hidden;
            display:inline-block;
            align-self:baseline;
        } */
        </style>
        <style id=typeCss></style>
        <div id=input>
            <slot name=start></slot>
            <slot></slot>
            <slot name=end></slot>
        </div>
        `;
        this._internals = this.attachInternals();

        this.addEventListener('input', e => {
            if (e.target === this) return;
            this._updateOwnFormValue()
            this.hasAttribute('name') && this.dispatchEvent(new Event('input', {bubbles: true}));
        });
    }
    _updateOwnFormValue(){
        const inputs = [...this.querySelectorAll('input,textarea,select,button')];
        const value = inputs.map(input => input.value).join('');
        this._internals.setFormValue(value);
    }

    connectedCallback() {
        this.realInput = this.querySelector('input,textarea,select');
        if (this.realInput) this._updateOwnFormValue();
    }
    get type(){
        if (this.hasAttribute('type')) return this.getAttribute('type'); // todo? test if exists?
        if (this.realInput) {
            if (this.realInput.tagName === 'TEXTAREA') return 'textarea';
            if (this.realInput.tagName === 'SELECT') return 'select';
            return this.realInput.type;
        }
        return 'text';
    }

    formStateRestoreCallback(state, reason){
        if (this.realInput) this.realInput.value = state;
    }

    static formAssociated = true;
    static observedAttributes = ['type', 'value'];

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'type') {
            
            // if innerHTML was generated, remove it
            const mainSlot = this.shadowRoot.querySelector('slot:not([name])');
            if (this.fallbackActive) mainSlot.assignedNodes().forEach(node => node.remove());
            
            if (!mainSlot.assignedElements().length) {
                this.innerHTML += types[newValue]?.fallback ?? types['text'].fallback;
                this.fallbackActive = true;
            }
            this.realInput = this.querySelector('input,textarea,select');

            this._updateOwnFormValue();

            types[newValue] ??= types['text'];
            this.shadowRoot.getElementById('input').innerHTML = types[newValue].input;
            this.shadowRoot.getElementById('typeCss').textContent = types[newValue].css ?? '';
            setTimeout(()=> {
                types[newValue].init?.call(this, {shadow: this.shadowRoot});
            });

        }
        if (name === 'value') {            
            this.realInput.defaultValue = newValue;  // this.realInput.value = newValue; // better defaultValue?
        }
    }

    /* checkbox */
    set value(value) { this.realInput.value = value; }
    get form() { return this._internals.form; }
    get value() { return this.realInput.value; }
});


/* todo: could be a global tool */
document.addEventListener('dragenter', e => {
    if (e.relatedTarget != null) return;
    const hasFile = [...e.dataTransfer.items].some(item => item.kind === 'file');
    if (hasFile) {
        document.documentElement.classList.add('u2DraggingFile');
    }
});
document.addEventListener('dragleave', e => {
    if (e.relatedTarget != null) return;
    document.documentElement.classList.remove('u2DraggingFile');
});
document.addEventListener('drop', e => {
    document.documentElement.classList.remove('u2DraggingFile');
});

