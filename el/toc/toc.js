class Toc extends HTMLElement {
    constructor() {
        super();
        //this.attachShadow({ mode: 'open' });
        //this.shadowRoot.innerHTML = `<slot></slot>`;
    }

    connectedCallback() {
        this._build();
        requestAnimationFrame(() => this._build());
        window.addEventListener('load', () => this._build());
    }

    _build() {
        const container = this;
        container.innerHTML = '';
        
        const nav = document.createElement('nav');
        container.appendChild(nav);

        let headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];

        // count h1 headings and if there is only one, use h2 as top level
        let h1Count = 0;
        for (let heading of headings) {
            if (heading.tagName === 'H1') h1Count++;
        }
        if (h1Count < 2) {
            headings = headings.filter(heading => heading.tagName !== 'H1');
        }

        let lastLevel = 0;
        let currentUl = nav;
        let currentLi = null;

        for (let heading of headings) {
            if (!heading.id) heading.id = heading.textContent.trim().replace(/\s+/g, '-').toLowerCase();

            const level = parseInt(heading.tagName[1]);

            if (level > lastLevel) {
                const ul = document.createElement('ul');
                if (currentLi) {
                    currentLi.appendChild(ul);
                } else {
                    currentUl.appendChild(ul);
                }
                currentUl = ul;
            } else if (level < lastLevel) {
                for (let i = level; i < lastLevel; i++) {
                    currentUl = currentUl.parentElement.closest('ul') || nav;
                }
            }

            currentLi = document.createElement('li');
            currentUl.appendChild(currentLi);

            const a = document.createElement('a');
            a.href = '#' + heading.id;
            a.textContent = heading.textContent;
            currentLi.appendChild(a);

            lastLevel = level;
        }
    }
}

customElements.define('u2-toc', Toc);
