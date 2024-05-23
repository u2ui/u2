// See https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel

const types = {
    'text': {
        fallback: '<input type=text>',
        input: `<slot name=start></slot><slot></slot><slot name=end></slot>`,
    },
    'stepper': {
        fallback: '<input type=number>',
        input: `
            <slot name=start></slot>
            <button part=button class="down">
                <u2-ico icon=minus inline>-</u2-ico>
            </button>
            <slot></slot>
            <button part=button class="up">
                <u2-ico icon=plus inline>+</u2-ico>
            </button>
            <slot name=end></slot>`,
        css: `
            ::slotted(input) {
                text-align:center;
                appearance:textfield;
            }
            :host {
                inline-size: 6em;
            }
            `,
        init({shadow}) {
            shadow.querySelector('.up').addEventListener('click', ()=> this.realInput.stepUp() );
            shadow.querySelector('.down').addEventListener('click', ()=> this.realInput.stepDown() );
        }
    },
    'checkbox': {
        fallback: '<select><option value="">off</option><option value=on>on</select>',
        input: `
            <slot name=start></slot>
            <input type=checkbox id=checkbox>
            <slot name=end></slot>`,
        css: `#input { border:0; }`,
        init({shadow}) {
            setTimeout(()=> {
                const real = this.realInput;
                const checkbox = shadow.querySelector('#checkbox');
                checkbox.addEventListener('change', e => {
                    real.value = checkbox.checked ? real.lastElementChild.value : real.firstElementChild.value;
                });
                checkbox.checked = real.value === real.lastElementChild.value;
            });
        }
    },
    'cycle': {
        fallback: '',
        input: `<slot style="display:grid;"> </slot>`,
    },
    'file': {
        fallback: '<input type=file multiple>',
        input: `
            <div id=droparea>
                <button id=browse>
                    Durchsuchen...
                    <small id=num></small>
                </button>
                <textarea tabindex=-1></textarea>
                <div id=preview>
                    <table id=previewTable>
                    </table>
                </div>
            </div>
            `,
        css: `
            :host {
                vertical-align: top;
            }
            #droparea {
                flex:1 1 auto;
                position:relative;
                padding:.2em;
                display:grid;
                place-items:center;
                textarea {
                    z-index:-1;
                    position:absolute;
                    inset:0;
                xbackground:#ffa9;
                    background:transparent;
                    resize:none;
                    border:0;
                    margin:0;
                    color : transparent;
                }
            }
            #browse {
                font:inherit;
                #num {
                    background:var(--color-light,#eee);

                    display:inline-flex;
                    border-radius:1em;
                    line-height:1.1;                
                    min-width:  1.6em;
                    min-height: 1.6em;
                    padding-inline: .6em;
                    padding-block: .2em .25em;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    box-sizing: border-box;
                    font-size: 0.8em;

                    &:empty {
                        display:none;
                    }
                }
            }
            #preview {
                white-space:nowrap;
                overflow:auto;
                font-size:12px;
                xmax-width: 100%;
                width:100%;
                max-height: 10rem;
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
                max-width:30px;
                max-height:30px;
                object-fit:contain;
            }
            `,
        init({shadow}) {
            import ('../bytes/bytes.js');
            const real = this.realInput;
            real.addEventListener('change', e => showPreview());
            shadow.getElementById('browse').addEventListener('click', e => {
                real.click();
            });
            this.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });
            this.addEventListener('drop', e => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
            });
            this.addEventListener('paste', e => {
                addFiles(e.clipboardData.files);
            });
            // function setFiles(files){
            //     real.files = e.clipboardData.files;
            //     showPreview();
            // }
            function addFiles(files) {
                let list = new DataTransfer();
                for (let file of files) list.items.add(file);
                for (let item of real.files) list.items.add(item);
                real.files = list.files;
                showPreview();
            }
            function showPreview() {
                const preview = shadow.querySelector('#previewTable');
                preview.innerHTML = '';
                for (let file of real.files) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class=img style="vertical-align:center; text-align:center"></td>
                        <td><div style="overflow:hidden;text-overflow:ellipsis;">${file.name}</div></td>
                        <u2-bytes style="display:table-cell; vertical-align:middle">${file.size}</u2-bytes>
                    `;
                    // check if its an image
                    if (file.type.startsWith('image/')) {
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(file);
                        img.alt = file.name;
                        img.onload = e => URL.revokeObjectURL(img.src);
                        tr.querySelector('.img').appendChild(img);
                    }
                    preview.appendChild(tr);


                    //preview.appendChild(img);
                }
                shadow.getElementById('num').textContent = real.files.length;
            }
        }
    },
}

const icoCss = import.meta.resolve('../ico/ico.css');
customElements.define('u2-input', class extends HTMLElement {
    constructor(...args) {
        super(...args);

        let shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true });

        shadowRoot.innerHTML = `
        <style>
        @import url('${icoCss}');

        :host {
            display:inline-block;
            inline-size:13em;
            border-radius: var(--radius);
        }
        #input {
            display: flex;
            align-items: center;
            overflow:clip;
            border: 1px solid;
            border-radius: inherit;
        }

        [name=start]::slotted(*) { margin-inline-start: .4rem; }
        [name=end]::slotted(*) { margin-inline-end: .4rem; }

        ::slotted(input), ::slotted(textarea), ::slotted(select) {
            margin: 0;
            border: 0 !important;
            outline: 0 !important;
            flex:1 1 auto;
            inline-size:auto;
        }
        ::slotted(input) {
            inline-size:100% !important;
        }
        [part=button], xbutton {
            background:var(--color-light, #eee);
            align-self:stretch;
            min-width:2em;
            &:active, &:focus, &:hover {
                background: #e9e9e9;
                outline:0;
                opacity:1;
            }
            /* only if hover */
            transition:.2s;
            opacity:0;
            :host(:hover) & {
                opacity:1;
            }
        }

        button {
            border: 0;
            background-color: transparent;
        }
        #input::before { /* dirty trick, first char defines the baseline, otherwise the sibling elements would no longer be at the same baseline */
            content:'p';
            width:0;
            overflow:hidden;
            display:inline-block;
        }
        </style>
        <style id=typeCss>
        </style>
        <div id=input>
            <slot name=start></slot>
            <slot></slot>
            <slot name=end></slot>
        </div>
        `;
        this._internals = this.attachInternals();
    }

    connectedCallback() {
        this.realInput = this.querySelector('input,textarea,select');
        if (this.realInput) this._syncRealToFake();
    }

    _syncRealToFake() {
        if (this.realInput.tagName === 'TEXTAREA') {
            this.setAttribute('type','textarea');
        }
        this.setAttribute('value', this.realInput.value);
        this.realInput.hasAttribute('name') && this.setAttribute('name', this.realInput.name);

        this._internals.setFormValue(this.realInput.value);
        this.realInput.addEventListener('input', e => {
            this._internals.setFormValue(this.realInput.value, this.realInput.value);
        });
    }
    formStateRestoreCallback(state, reason){
        this.realInput.value = state;
    }

    static observedAttributes = ['type', 'value'];
    static formAssociated = true;


    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'type') {

            this.realInput = this.querySelector('input,textarea,select');
            if (this.realInput) this._syncRealToFake();

            if (!this.realInput) {
                this.innerHTML = types[newValue]?.fallback ?? types['text'].fallback;
                this.realInput = this.querySelector('input,textarea,select');
                this._syncRealToFake();
            }

            types[newValue] ??= types['text'];
            this.shadowRoot.getElementById('input').innerHTML = types[newValue].input;
            this.shadowRoot.getElementById('typeCss').textContent = types[newValue].css ?? '';
            setTimeout(()=> {
                types[newValue].init?.call(this, {shadow: this.shadowRoot});
            });

        }
        if (name === 'value') {
            this.realInput.value = newValue;
        }
    }

    /* checkbox */
    get value(){
        return this.realInput.value;
    }
});




