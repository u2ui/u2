// See https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel


customElements.define('u2-buttongroup', class extends HTMLElement {
    constructor(...args) {
        super(...args);

        
        this.resizeObserver = new ResizeObserver(() => {
            this._build();
            console.log('resize');
        });

        this.splitButton = document.createElement('u2-splitbutton');
        this.splitButton.innerHTML = `
        <button style="padding-inline:.4em">
            <u2-ico inline>more_vert</u2-ico>
        </button>
        <menu></menu>
        `;


    }

    _build() {
        let hasmMore = false;
        const containerWidth = this.clientWidth;
        const items = [...this.children].map(btn => {return {btn, width: btn.clientWidth}}); // todo: clientWidth when flex:0 0 auto
        let fullWidth = items.reduce((acc, item) => acc + item.width, 0);
        while ( fullWidth > containerWidth) {
            const item = items.pop();
            if (item.btn.tagName === 'U2-SPLITBUTTON') continue;
            const li = document.createElement('li');
            li.appendChild(item.btn);
            this.splitButton.querySelector('menu').prepend(li);
            fullWidth -= item.width;
            hasmMore = true;
        }
        if (hasmMore) {
            this.appendChild(this.splitButton);
        }
    }

    connectedCallback() {
        setTimeout(() => {
            requestAnimationFrame(() => {
                this._build();
            });
        },500);
        this.resizeObserver.observe(this);
    }
    disconnectedCallback() {
        this.resizeObserver.unobserve(this);
    }

});
