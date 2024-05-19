// See https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel


customElements.define('u2-buttongroup', class extends HTMLElement {
    constructor(...args) {
        super(...args);

        let shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true });

        shadowRoot.innerHTML = `
        <style>
        </style>
        <slot>
            <u2-splitbutton>
                <button>
                    <u2-ico>⋮</u2-ico>
                </button>
            </u2-splitbutton>
        </slot>

        `;
        this._internals = this.attachInternals();
    }

    _build() {
        for (let el of this.children) {

        }

    }

    connectedCallback() {
        this.realbuttongroup = this.querySelector('buttongroup,textarea,select');
        if (this.realbuttongroup) this._syncRealToFake();
    }

});
