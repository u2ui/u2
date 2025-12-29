
class U1Pagination extends HTMLElement {
    connectedCallback() {
        console.log(1)
        this.render();
        this.addEventListener('click', this.#handleClick);
    }

    #handleClick = e => {
        const target = e.target.closest('a[data-page]');
        if (!target) return;
        const event = new CustomEvent('u2-pagination-change', {
            detail: { page: +target.dataset.page, previous: this.current },
            bubbles: true, composed: true, cancelable: true
        });
        this.dispatchEvent(event);
        event.defaultPrevented && e.preventDefault();
    };

    get href() { return this.getAttribute('href') || '?page={page}'; }
    get total() { return +this.getAttribute('total') || 1; }
    get current() { return +this.getAttribute('current') || this.#detectCurrentPage(); }

    #detectCurrentPage() {
        const currentUrl = window.location.href;
        for (let page = 1; page <= this.total; page++) {
            const pageUrl = this.href.replace('{page}', page);
            const fullUrl = new URL(pageUrl, window.location.href).href;
            if (currentUrl === fullUrl || currentUrl.startsWith(fullUrl + '#')) {
                return page;
            }
        }
        return 1;
    }
    #calculatePages() {
        const { total, current } = this;
        const maxItems = Math.floor((this.clientWidth || 600) / 40) - 2;

        if (maxItems < 5 || total <= maxItems) {
            return total <= maxItems
                ? Array.from({ length: total }, (_, i) => i + 1)
                : this.#getMinimalPages();
        }

        const sideItems = Math.floor((maxItems - 3) / 2);
        let start = Math.max(2, current - sideItems);
        let end = Math.min(total - 1, current + sideItems);

        if (current <= sideItems + 2) {
            end = Math.min(total - 1, maxItems - 1);
            start = 2;
        } else if (current >= total - sideItems - 1) {
            start = Math.max(2, total - maxItems + 2);
            end = total - 1;
        }

        const pages = [1];
        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < total - 1) pages.push('...');
        if (total > 1) pages.push(total);

        return pages;
    }

    #getMinimalPages() {
        const { total, current } = this;
        const pages = [1];
        if (current > 2) pages.push('...');
        if (current !== 1 && current !== total) pages.push(current);
        if (current < total - 1) pages.push('...');
        if (total > 1) pages.push(total);
        return pages;
    }

    #updateLink(a, page, label, rel) {
        a.href = this.href.replace('{page}', page);
        a.innerHTML = label ? `<span aria-hidden="true">${label}</span>` : page;
        a.dataset.page = page;
        a.setAttribute('aria-label', rel ? `${rel} page` : `Page ${page}`);
        if (rel) a.setAttribute('rel', rel);
        else a.removeAttribute('rel');
        if (page === this.current) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
    }

    render() {
        const { current, total } = this;
        const pages = this.#calculatePages();

        let nav = this.querySelector('nav');
        if (!nav) {
            nav = document.createElement('nav');
            nav.setAttribute('aria-label', 'Pagination');
            nav.innerHTML = '<ul u2-focusgroup="remember"></ul>';
            this.append(nav);
        }
        
        const ul = nav.querySelector('ul');
        const items = [];
        
        // Previous
        if (current > 1) items.push({ type: 'prev', page: current - 1 });
        
        // Pages
        pages.forEach(page => {
            items.push(page === '...' ? { type: 'dots' } : { type: 'page', page });
        });
        
        // Next
        if (current < total) items.push({ type: 'next', page: current + 1 });
        
        // Update oder erstelle list items
        const lis = Array.from(ul.children);
        items.forEach((item, i) => {
            let li = lis[i];
            if (!li) {
                li = document.createElement('li');
                ul.append(li);
            }
            
            if (item.type === 'dots') {
                li.innerHTML = '<span aria-hidden="true">…</span>';
            } else {
                let a = li.querySelector('a');
                if (!a) {
                    a = document.createElement('a');
                    li.innerHTML = '';
                    li.append(a);
                }
                
                const label = item.type === 'prev' ? '←' : item.type === 'next' ? '→' : null;
                this.#updateLink(a, item.page, label, item.type !== 'page' ? item.type : null);
            }
        });
        
        // Entferne überschüssige items
        while (ul.children.length > items.length) {
            ul.lastChild.remove();
        }
    }

    static observedAttributes = ['total', 'current', 'href'];

    attributeChangedCallback() {
        if (this.isConnected) this.render();
    }
}

customElements.define('u2-pagination', U1Pagination);