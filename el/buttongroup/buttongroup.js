// See https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel


customElements.define('u2-buttongroup', class extends HTMLElement {
    constructor(...args) {
        super(...args);

        let shadowRoot = this.attachShadow({ mode: 'open', delegatesFocus: true });

        shadowRoot.innerHTML = `
        <style>
        </style>
        <div class=buttongroup>
        </div>
        `;
        this._internals = this.attachInternals();
    }

    connectedCallback() {
        this.realbuttongroup = this.querySelector('buttongroup,textarea,select');
        if (this.realbuttongroup) this._syncRealToFake();
    }

});
