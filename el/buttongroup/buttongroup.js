// See https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel


customElements.define('u2-buttongroup', class extends HTMLElement {
    constructor(...args) {
        super(...args);
        this.resizeObserver = new ResizeObserver(() => this._build());
        //import ('../menubutton/menubutton.js'); // needs the css too
    }

    _build() {
        let hasmMore = false;
        const containerWidth = this.clientWidth;
        const items = [...this.children].map(btn => {return {btn, width: btn.clientWidth}}); // todo: clientWidth when flex:0 0 auto
        let fullWidth = items.reduce((acc, item) => acc + item.width, 0);

        while (fullWidth > containerWidth) {
            const item = items.pop();
            if (item.btn.tagName === 'U2-MENUBUTTON') continue;
            const li = document.createElement('li');
            li.appendChild(item.btn);
            this.menuButton.querySelector('menu').prepend(li);
            fullWidth -= item.width;
            hasmMore = true;
        }
        if (hasmMore) {
            this.appendChild(this.menuButton);
        }
    }

    connectedCallback() {
        requestAnimationFrame(() => {
            this.menuButton = this.querySelector(':scope > u2-menubutton');
            if (!this.menuButton) {
                this.menuButton = document.createElement('u2-menubutton');
                this.menuButton.innerHTML = `
                <button style="padding-inline:.3em">
                    <u2-ico inline icon=more_vert>⋮</u2-ico>
                </button>
                <menu></menu>
                `;    
            }
            this._build()
        });
        this.resizeObserver.observe(this);
    }
    disconnectedCallback() {
        this.resizeObserver.unobserve(this);
    }

});
