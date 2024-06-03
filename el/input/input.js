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
            `,
        init({shadow}) {
            const triggerInput = ()=>{
                this.dispatchEvent(new Event('input', {bubbles: true}));
            };
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
    // 'country' : {
    //     fallback: '<input type=text autocomplete=country placeholder="DE" regex="^[A-Z]{2}$">',
    //     input: `<slot name=start></slot><select autocomplete=country id=selectEl></select><slot name=end></slot>`,
    //     init({shadow}) {
    //         const real = this.realInput;
    //         const select = shadow.getElementById('selectEl');
    //         const codes = ["","AF","AL","DZ","AS","AD","AO","AI","AQ","AG","AR","AM","AW","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO","BQ","BA","BW","BV","BR","IO","BN","BG","BF","BI","CV","KH","CM","CA","KY","CF","TD","CL","CN","CX","CC","CO","KM","CD","CG","CK","CR","HR","CU","CW","CY","CZ","CI","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FK","FO","FJ","FI","FR","GF","PF","TF","GA","GM","GE","DE","GH","GI","GR","GL","GD","GP","GU","GT","GG","GN","GW","GY","HT","HM","VA","HN","HK","HU","IS","IN","ID","IR","IQ","IE","IM","IL","IT","JM","JP","JE","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI","LT","LU","MO","MG","MW","MY","MV","ML","MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC","MN","ME","MS","MA","MZ","MM","NA","NR","NP","NL","NC","NZ","NI","NE","NG","NU","NF","MP","NO","OM","PK","PW","PS","PA","PG","PY","PE","PH","PN","PL","PT","PR","QA","MK","RO","RU","RW","RE","BL","SH","KN","LC","MF","PM","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SX","SK","SI","SB","SO","ZA","GS","SS","ES","LK","SD","SR","SJ","SE","CH","SY","TW","TJ","TZ","TH","TL","TG","TK","TO","TT","TN","TR","TM","TC","TV","UG","UA","AE","GB","UM","US","UY","UZ","VU","VE","VN","VG","VI","WF","EH","YE","ZM","ZW","AX"];
    //         const lang = navigator.language;
    //         const regionNamesInEnglish = new Intl.DisplayNames([lang], { type: 'region' });
    //         codes.forEach(code => {
    //             const option = document.createElement('option');
    //             option.value = code;
    //             option.text = code ? regionNamesInEnglish.of(code) : '';
    //             select.appendChild(option);
    //         });
    //         select.value = real.value;
    //         select.addEventListener('change', e => {
    //             real.value = select.value;
    //         });
    //     }
    // },
    'checkbox': {
        fallback: '<select><option value="">off</option><option value=on>on</select>',
        input: `
            <slot name=start></slot>
            <input type=checkbox id=checkbox>
            <slot name=end></slot>`,
        css: `
            :host {
                inline-size:auto;
            }
            #input { xborder:0; width:auto; }
        `,
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
                <!--textarea tabindex=-1></textarea-->
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
                /*textarea {
                    z-index:-1;
                    position:absolute;
                    inset:0;
                    background:transparent;
                    resize:none;
                    border:0;
                    margin:0;
                    color : transparent;
                    &:focus {
                        background:rgba(0,0,0,.1);
                    }
                }*/
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
                    vertical-align: text-bottom;

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
            shadow.getElementById('browse').addEventListener('click', e => {
                real.click();
            });
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
            align-items: baseline;
            overflow:clip;
            border: 1px solid;
            border-radius: inherit;
        }

        [name=start]::slotted(*) { margin-inline-start: .5em; }
        [name=end]::slotted(*) { margin-inline-end: .5em; }

        ::slotted(input), ::slotted(textarea), ::slotted(select) {
            margin: 0;
            border: 0 !important;
            outline: 0 !important;
            box-shadow:none !important;
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
        #input::before, #input::after { /* dirty trick, first char defines the baseline, otherwise the sibling elements would no longer be at the same baseline */
            content:'p';
            width:0;
            overflow:hidden;
            display:inline-block;
            align-self:baseline;
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

        this.addEventListener('input', e => this._updateOwnFormValue());
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
        this.realInput.value = state;
    }

    static formAssociated = true;
    static observedAttributes = ['type', 'value'];

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'type') {
            this.realInput = this.querySelector('input,textarea,select');

            if (!this.realInput) {
                this.innerHTML = types[newValue]?.fallback ?? types['text'].fallback;
                this.realInput = this.querySelector('input,textarea,select');
            }
            if (this.realInput) this._updateOwnFormValue();

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
    get value(){
        return this.realInput.value;
    }
    set value(value){
        this.realInput.value = value;
    }
});


/* todo: could be a global tool */
document.addEventListener('dragenter', e => {
    if (e.relatedTarget != null) return;
    let hasFile = false;
    for (let item of e.dataTransfer.items) {
        if (item.kind === 'file') hasFile = true;
    }
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

