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

export default class U2Breadcrumb extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open', slotAssignment: 'manual' });
        const nav = document.createElement('nav');
        //nav.ariaLabel = this.getAttribute('aria-label') || 'Breadcrumb';
        nav.ariaLabel ??= 'Breadcrumb';
        this.ol = document.createElement('ol');
        nav.append(this.ol);
        this.shadowRoot.adoptedStyleSheets = [styleSheet];
        this.shadowRoot.append(nav);
    }
    connectedCallback() {
        this.render();
        this.observer = new MutationObserver(() => this.render());
        this.observer.observe(this, { childList: true });
        if (this.hasAttribute('auto')) {
            import('../../js/navigator/url-change-event.js');
            this.generateFromLocation();
            addEventListener('u2-url-change', ({detail})=>{
                if (detail.sameDocument) return;
                setTimeout(()=> this.generateFromLocation() ,20);
            })
        }
    }
    generateFromLocation() {
        this.innerHTML = '';
        const currentUrl = new URL(location.href);
        const pathParts = currentUrl.pathname.match(/[^/]+\/|[^/]+/g) || [];
        let currentPath = currentUrl.origin + '/'; // starts with the base url (e.g. https://example.com)
        const homeLink = document.createElement('a'); // start element "Home" (/)
        homeLink.textContent = 'Home';
        homeLink.href = currentUrl.origin + '/';
        this.append(homeLink);

        pathParts.forEach(part => {
            currentPath += part;
            const name = part.replace('/','').replaceAll('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const link = document.createElement('a');
            link.textContent = name;
            link.href = currentPath;
            this.append(link);
        });
    }
    disconnectedCallback() {
        this.observer.disconnect();
    }

    render() {
        const links = [...this.querySelectorAll(':scope > :not(script)')];

        const pageUrl = location.href.split('#')[0].split('?')[0];
        this.ol.innerHTML = '';
        links.forEach(link => {
            const li = document.createElement('li');
            const slot = document.createElement('slot');
            const separator = document.createElement('span');
            separator.part = 'separator';
            //const locationUrl = location.href;
            //if (link.href === locationUrl) link.ariaCurrent = 'location';
            requestAnimationFrame(() => slot.assign(link)); // chrome...
            li.append(slot, separator);
            this.ol.append(li);
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
                "item": new URL(link.href, location.origin).href
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

customElements.get('u2-breadcrumb') || customElements.define('u2-breadcrumb', U2Breadcrumb);
