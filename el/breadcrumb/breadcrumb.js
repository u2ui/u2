const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(`
    :host { display: flex; }      
    nav { display: contents; }
    ol { display: contents; }      
    li {
        display: inline-flex;
        align-items: center;
    }
    [part=separator] {
        content: var(--u2-breadcrumb-separator);
        margin-inline: var(--u2-breadcrumb-separator-margin-inline);

        &::before {
            content: inherit; /* does not work in chrome :( */
            content: var(--u2-breadcrumb-separator);
        }
        li:last-child > & {
            display:none;
        }
    }
`);

class U2Breadcrumb extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open', slotAssignment: 'manual' });
        const nav = document.createElement('nav');
        //nav.ariaLabel = this.getAttribute('aria-label') || 'Breadcrumb';
        nav.ariaLabel ??= 'Breadcrumb';
        this.ol = document.createElement('ol');
        nav.appendChild(this.ol);
        this.shadowRoot.adoptedStyleSheets = [styleSheet];
        this.shadowRoot.appendChild(nav);
    }
    connectedCallback() {
        this.render();
        this.observer = new MutationObserver(() => this.render());
        this.observer.observe(this, { childList: true });
        if (this.hasAttribute('auto')) {
            const currentUrl = new URL(location.href);
            const pathParts = currentUrl.pathname.split('/').filter(part => part.trim() !== '');
            let currentPath = currentUrl.origin; // Startet mit der Basis-URL (z.B. https://example.com)
            
            const homeLink = document.createElement('a'); // Start-Element "Home" (/)
            homeLink.textContent = 'Home';
            homeLink.href = currentUrl.origin + '/';
            this.appendChild(homeLink);

            pathParts.forEach((part, index) => {
                currentPath += '/' + part;
                const name = part.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const link = document.createElement('a');
                link.textContent = name;
                link.href = currentPath; // Fertig aufgebaute URL
                this.appendChild(link);
            });
        }
    }
    disconnectedCallback() {
        this.observer.disconnect();
    }

    render() {
        const links = Array.from(this.querySelectorAll(':scope > :not(script)'));

        this.ol.innerHTML = '';
        links.forEach((link, index) => {
            const li = document.createElement('li');
            const slot = document.createElement('slot');
            const separator = document.createElement('span');
            separator.part = 'separator';
            //const locationUrl = location.href;
            //if (link.href === locationUrl) link.ariaCurrent = 'location';
            slot.assign(link);
            li.append(slot, separator);
            this.ol.append(li);
            const pageUrl = location.href.split('#')[0];
            if (link.href === pageUrl) {
                link.ariaCurrent = 'page';
                link.dataset.href = link.getAttribute('href');
                link.removeAttribute('href'); // ok?
            }
        });

        // generate json ld
        const breadcrumbData = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": links.map((link, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": link.textContent.trim(),
                "item": new URL(link.href, window.location.origin).href
            }))
        };
        this.ldScript.textContent = JSON.stringify(breadcrumbData, null, 2);
    }
    get ldScript() {
        this._ldScript ??= this.querySelector('script[type="application/ld+json"]');
        if (this._ldScript) return this._ldScript;
        this._ldScript = document.createElement('script');
        this._ldScript.type = 'application/ld+json';
        this.append(this._ldScript);
        return this._ldScript;
    }
}

customElements.define('u2-breadcrumb', U2Breadcrumb);