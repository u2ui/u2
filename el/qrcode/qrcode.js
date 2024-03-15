
customElements.define('u1-qrcode', class extends HTMLElement {

    constructor() {
        super();
        let shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `
        <style>
        #container { display:contents; }
        #container > * { display:block; }
        svg { fill:currentColor; }
        </style>
        <div id=container></div>
        `;
    }

    connectedCallback() {
        this._redraw();
    }

    async _redraw() {
        const container = this.shadowRoot.getElementById('container');
        const text = this.textContent; // todo: trim() ? can it be harmful?
        container.setAttribute('aria-label', 'QR-Code: '+text);
        const {default:{QrCode}} = await import('https://cdn.jsdelivr.net/npm/nayuki-qr-code-generator@1.8.0/index.min.js');
        const qr0 = QrCode.encodeText(text, QrCode.Ecc.MEDIUM);
        container.innerHTML = toSvgString(qr0, 4);
    }

});

function toSvgString(qr) {
    const border = 0;
    let parts = [];
    for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y))
                parts.push(`M${x + border},${y + border}h1v1h-1z`);
        }
    }
    return `
    <svg viewBox="0 0 ${qr.size + border * 2} ${qr.size + border * 2}">
        <path d="${parts.join(" ")}"/>
    </svg>
    `
}