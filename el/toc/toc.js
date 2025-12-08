import '../../js/navigator/url-change-event.js';

class Toc extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        requestAnimationFrame(() => this._build());
        addEventListener('load', () => this._build());
        addEventListener('u2-url-change', ({detail})=>{
            !detail.sameDocument && setTimeout(()=>this._build(),20); // wait for navigator :(
        });
    }

    static observedAttributes = ['from', 'to', 'for'];
    attributeChangedCallback(name, oldValue, newValue) {
        if (newValue === oldValue) return;
        this._build();        
    }

    _build() {
        const nav = document.createElement('nav');

        const to = parseInt(this.getAttribute('to') || 6);
        const scopeId = this.getAttribute('for');
        const fromAttr = this.getAttribute('from') || 'auto';

        let from = parseInt(fromAttr) || 1;

        const root = scopeId ? document.getElementById(scopeId) : document;

        const counts = [0,0,0,0,0,0,0];

        let headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')]
            .filter(h => {
                const lvl = parseInt(h.tagName[1]);
                counts[lvl]++;
                return lvl >= from && lvl <= to;
            });

        // auto: from is the first level where there are at least 2 headings
        if (fromAttr === 'auto') {
            from = counts.findIndex(count => count > 1);
            headings = headings.filter(h => h.tagName[1] >= from );
        }

        let lastLevel = 0;
        let currentUl = nav;
        let currentLi = null;

        for (let heading of headings) {
            heading.id ||= 'u2-toc-' + heading.textContent.trim().replace(/\s+/g, '-').toLowerCase();

            const level = parseInt(heading.tagName[1]);

            if (level > lastLevel) {
                const ul = document.createElement('ul');
                currentLi ? currentLi.append(ul) : currentUl.append(ul);
                currentUl = ul;
            } else if (level < lastLevel) {
                for (let i = level; i < lastLevel; i++) {
                    currentUl = currentUl.parentElement.closest('ul') || nav;
                }
            }

            currentLi = document.createElement('li');
            currentLi.innerHTML = `<a href="#${heading.id}">${heading.textContent}</a>`;
            currentUl.append(currentLi);

            lastLevel = level;
        }
        if (this.innerHTML.trim() === nav.outerHTML) return;
        this.innerHTML = '';
        this.appendChild(nav);
    }
}

customElements.define('u2-toc', Toc);
