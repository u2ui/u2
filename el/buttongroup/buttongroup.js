// See https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel

// todo? attribute overflow: scroll | dropdown | break

customElements.define('u2-buttongroup', class extends HTMLElement {
    constructor(...args) {
        super(...args);
        this.resizeObserver = new ResizeObserver(() => this._build());
        this.setAttribute('u2-focusgroup','horizontal remember');
        import('../../attr/focusgroup/focusgroup.js')
        //import ('../menubutton/menubutton.js'); // needs the css too
    }

    addItemToMenu(item) {
        const li = document.createElement('li');
        li.append(item);
        this.menuButton.querySelector('menu').prepend(li);
    }
    _build() {

        let hasMore = false;

        if (this.scrollWidth <= this.clientWidth) {
            const li = this.menuButton.querySelector(':scope > menu > :first-child');
            if (li) {
                hasMore = true;
                const item = li.querySelector('*');
                li.remove();
                const last = this.querySelector(':scope > :not(u2-menubutton):last-of-type');
                if (last) last.after(item);
                else this.prepend(item);
            }
        }
        
        const items = [...this.children].filter(item => item.tagName !== 'U2-MENUBUTTON');
        
        while (this.scrollWidth > this.clientWidth) {
            const item = items.pop();
            if (!item) break;
            this.addItemToMenu(item);
            hasMore = true;
        }

        hasMore ? this.appendChild(this.menuButton) : this.menuButton.remove();
    }

    connectedCallback() {
        this.role ??= 'group';
        requestAnimationFrame(() => {
            this.menuButton = this.querySelector(':scope > u2-menubutton');
            if (!this.menuButton) {
                this.menuButton = document.createElement('u2-menubutton');
                //this.menuButton.style['--u2-ico-dir'] = 'var(--u2-ico-dir-material)';
                this.menuButton.innerHTML = 
                `<button style="padding-inline:.3em"><u2-ico inline icon=more-vert>⋮</u2-ico></button>
                <menu></menu>`;    
            }
            this._build();
        });
        this.resizeObserver.observe(this);
        this.resizeObserver.observe(this.parentElement);
    }
    disconnectedCallback() {
        this.resizeObserver.unobserve(this);
        this.resizeObserver.unobserve(this.parentElement);
    }

});
