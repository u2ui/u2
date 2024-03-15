// See https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel


customElements.define('u1-input', class extends HTMLElement {
    constructor(...args) {
        super(...args);

        let shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true });
        shadowRoot.innerHTML = `
        <style>
        :host {
            display: inline-flex;
            border: 1px solid;
        }
        ::slotted(input), ::slotted(textarea), ::slotted(select) {
            margin: 0;
            border: 0;
        }
        button {
            border: 0;
            background-color: transparent;
        }
        </style>
        <slot><input></slot>
        <button part=clear hidden>✕</button>
        `;
    }

    connectedCallback() {
        this.realInput = this.querySelector('input,textarea,select');
        if (this.realInput) this._syncRealToFake()
    }
    disconnectedCallback() {
    }

    _syncRealToFake() {
        if (this.realInput.tagName === 'TEXTAREA') {
            this.setAttribute('type','textarea');
        }
        this.setAttribute('value', this.realInput.value)
        this.setAttribute('name', this.realInput.name)
    }


    static get observedAttributes() { return ['type'] }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'type') {
            if (newValue === 'textarea') {
                this.innerHTML = '<textarea></textarea>';
            }
            if (newValue === 'checkbox') {
                this.innerHTML = '';
            }
        }
    }


    /* checkbox */
    get value(){
        if (this.type === 'checkbox') {
            return this.checked ? this.getAttribute('on')??'on' : this.getAttribute('off') ?? '';
        }
        return this.realInput.value;
    }
    set checked(value) {

    }
});



















/* old code

document.head.prepend(c1.dom.fragment(
    '<style>\
    .b1-up-down-input {\
        display:inline-flex;\
        width:6em;\
    }\
    .b1-up-down-input input {\
        width:2em;\
        flex:1 .5 auto;\
        text-align:center;\
        border-left-width:0;\
        border-right-width:0;\
    }\
    .b1-up-down-input button {\
    	width:1.6em;\
        flex:0 1 auto;\
        padding:0;\
        position:relative;\
    }\
    .b1-up-down-input button > span {\
        color:transparent;\
    }\
    .b1-up-down-input button > svg {\
        fill:currentColor;\
        width:.8em;\
        height:.8em;\
        vertical-align:baseline;\
        position:absolute;\
        top:0; left:0; right:0; bottom:0;\
        margin:auto;\
    }\
    .b1-up-down-input button.-up {\
    	xborder-left-width:0;\
    	border-top-left-radius: 0;\
    	border-bottom-left-radius: 0;\
    }\
    .b1-up-down-input button.-down {\
    	xborder-right-width:0;\
    	border-top-right-radius: 0;\
    	border-bottom-right-radius: 0;\
    	order: -1;\
    }\
    .b1-up-down-input input[type="number"] {\
        appearance:textfield;\
    }\
    .b1-up-down-input input::-webkit-outer-spin-button,\
    .b1-up-down-input input::-webkit-inner-spin-button {\
        -webkit-appearance: none;\
    }\
    </style>'
));


new SelectorObserver({
    on: el => {
        var input = el.c1Find('input');
        var up   = c1.dom.fragment('<button type=button aria-hidden=true tabindex=-1><span>+</span><svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" /></svg>').firstChild; // "+"-char: ally, baseline works | span: currentColor works
        var down = c1.dom.fragment('<button type=button aria-hidden=true tabindex=-1><span>-</span><svg viewBox="0 0 24 24"><path d="M19,13H5V11H19V13Z" /></svg>').firstChild;
        up.classList.add('-up');
        down.classList.add('-down');
        function onclick(e){
            //e.preventDefault(); // zzz not needed!
            var oldVal = input.value
            this.classList.contains('-up') ? input.stepUp() : input.stepDown();
            if (input.value !== oldVal) {
                input.dispatchEvent( new CustomEvent('input',{bubbles:true,cancelable:true}) );
                input.dispatchEvent( new CustomEvent('change',{bubbles:true,cancelable:true}) );
            }
        }
        up.addEventListener('click',onclick);
        down.addEventListener('click',onclick);
        input.after(up);
        // also after! because label triggers the first form-element (changed order in css)
        input.after(down);
    },
}).observe('.b1-up-down-input');

*/