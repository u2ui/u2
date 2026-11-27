
export default class U2Pagination extends HTMLElement {
    #ul; // its list; created on the first render, replacing the fallback content (e.g. prev/next links without js)
    #fit = 0; // items that fit, as last rendered for
    // renders anew only when another number fits (width, font, zoom, digits)
    #resize = new ResizeObserver(() => this.#fits() !== this.#fit && this.render());

    // the grid makes all items as wide as the widest; the current page's is always there and shown
    #fits() {
        const cell = this.#ul?.querySelector('[aria-current]')?.parentNode.offsetWidth;
        return cell ? Math.floor(this.clientWidth / cell) : 0;
    }

    connectedCallback() {
        this.render();
        this.addEventListener('click', this.#handleClick);
        this.#resize.observe(this);
        this.#resize.observe(this.#ul);
    }
    disconnectedCallback() {
        this.#resize.disconnect();
    }

    #handleClick = e => {
        const target = e.target.closest('a[data-page]');
        if (!target) return;
        const event = new CustomEvent('u2-pagination-change', {
            detail: { page: +target.dataset.page, previous: this.current },
            bubbles: true, composed: true, cancelable: true
        });
        if (!this.dispatchEvent(event)) e.preventDefault();
    };

    get href() { return this.getAttribute('href') || '?page={page}'; }
    get total() { return +this.getAttribute('total') || 1; }
    get current() { return Math.max(1, Math.min(+this.getAttribute('current') || this.#detectCurrentPage(), this.total)); }

    // "{page}" also URL-encoded, as URL APIs leave it ("?page=%7Bpage%7D")
    #url(page) { return this.href.replace(/\{page\}|%7Bpage%7D/gi, page); }

    #detectCurrentPage() {
        for (let page = 1; page <= this.total; page++) {
            const url = new URL(this.#url(page), location.href).href;
            if (location.href === url || location.href.startsWith(url + '#')) return page;
        }
        return 1;
    }

    // page numbers and null for a cut, as many as fit; until measured only the fewest
    #calculatePages() {
        const { total, current } = this;
        const maxItems = this.#fit - 2; // the arrows
        if (total <= maxItems) return range(1, total);
        if (maxItems < 5) return [current]; // no room for first, last and the cuts: the arrows around the current page
        // a window between the first and the last page, around the current one; at a cut, null takes its edge
        const size = maxItems - 2;
        const start = Math.min(Math.max(2, current - Math.floor((size - 1) / 2)), total - size);
        const pages = range(start, start + size - 1);
        if (start > 2) pages[0] = null;
        if (start + size < total) pages[size - 1] = null;
        return [1, ...pages, total];
    }

    #updateLink(a, page, rel, current) {
        const label = { prev: '←', next: '→' }[rel];
        const off = page < 1 || page > this.total; // an arrow at either end: disabled, not gone
        off ? a.removeAttribute('href') : a.href = this.#url(page);
        a.innerHTML = label ? `<span aria-hidden="true">${label}</span>` : page;
        off ? delete a.dataset.page : a.dataset.page = page;
        a.role = off ? 'link' : null; // without href it would be no link, its label and state unannounced
        a.ariaDisabled = off ? 'true' : null;
        a.ariaLabel = text(this, rel ?? 'page').replace('{i}', page);
        rel ? a.rel = rel : a.removeAttribute('rel');
        a.ariaCurrent = page === current ? 'page' : null;
    }

    render(again = true) {
        const { current } = this;
        this.#fit = this.#fits();

        if (!this.#ul) {
            this.innerHTML = `<nav aria-label="${text(this, 'nav')}"><ul u2-focusgroup></ul></nav>`;
            this.#ul = this.querySelector('ul');
        }
        const ul = this.#ul;

        // [page, rel] per link, null for a cut
        const items = [[current - 1, 'prev'], ...this.#calculatePages().map(page => page && [page]), [current + 1, 'next']];

        // focus follows its link, not its position: the same arrow, or the same page
        const f = this.contains(document.activeElement) && document.activeElement;
        const key = f && (f.rel ? `a[rel=${f.rel}][href]` : `a[data-page="${f.dataset.page}"]:not([rel])`);

        // update or create list items, kept for the focus
        items.forEach((item, i) => {
            const li = ul.children[i] ?? ul.appendChild(document.createElement('li'));
            li.ariaHidden = item ? null : 'true'; // a cut: no empty item in the list for screen readers
            if (!item) return li.textContent = '…';
            let a = li.querySelector('a');
            if (!a) li.replaceChildren(a = document.createElement('a'));
            this.#updateLink(a, item[0], item[1], current);
        });

        // remove surplus items
        while (ul.children.length > items.length) ul.lastChild.remove();
        if (key) (this.querySelector(key) ?? this.querySelector('[aria-current]'))?.focus();

        // measured otherwise than assumed: once more
        if (again && this.#fits() !== this.#fit) this.render(false);
    }

    static observedAttributes = ['total', 'current', 'href'];

    attributeChangedCallback() {
        if (this.isConnected) this.render();
    }
}

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// It speaks the language of its surroundings (the closest lang attribute), else the browser's.
const text = (el, key) => {
    const lang = (el.closest('[lang]')?.lang || navigator.language || 'en').slice(0, 2).toLowerCase();
    return (texts[lang] ?? texts.en)[KEYS.indexOf(key)];
};
const KEYS = ['nav', 'prev', 'next', 'page'];
const texts = {
    ar: ['ترقيم الصفحات', 'الصفحة السابقة', 'الصفحة التالية', 'الصفحة {i}'],
    cs: ['Stránkování', 'Předchozí stránka', 'Další stránka', 'Stránka {i}'],
    da: ['Sideinddeling', 'Forrige side', 'Næste side', 'Side {i}'],
    de: ['Seitennavigation', 'Vorherige Seite', 'Nächste Seite', 'Seite {i}'],
    en: ['Pagination', 'Previous page', 'Next page', 'Page {i}'],
    es: ['Paginación', 'Página anterior', 'Página siguiente', 'Página {i}'],
    fi: ['Sivutus', 'Edellinen sivu', 'Seuraava sivu', 'Sivu {i}'],
    fr: ['Pagination', 'Page précédente', 'Page suivante', 'Page {i}'],
    hi: ['पृष्ठांकन', 'पिछला पृष्ठ', 'अगला पृष्ठ', 'पृष्ठ {i}'],
    it: ['Paginazione', 'Pagina precedente', 'Pagina successiva', 'Pagina {i}'],
    ja: ['ページ送り', '前のページ', '次のページ', '{i} ページ'],
    ko: ['페이지 탐색', '이전 페이지', '다음 페이지', '{i}페이지'],
    nb: ['Sidenavigasjon', 'Forrige side', 'Neste side', 'Side {i}'],
    nl: ['Paginering', 'Vorige pagina', 'Volgende pagina', 'Pagina {i}'],
    pl: ['Paginacja', 'Poprzednia strona', 'Następna strona', 'Strona {i}'],
    pt: ['Paginação', 'Página anterior', 'Página seguinte', 'Página {i}'],
    ru: ['Навигация по страницам', 'Предыдущая страница', 'Следующая страница', 'Страница {i}'],
    sv: ['Sidnavigering', 'Föregående sida', 'Nästa sida', 'Sida {i}'],
    tr: ['Sayfalama', 'Önceki sayfa', 'Sonraki sayfa', 'Sayfa {i}'],
    uk: ['Навігація сторінками', 'Попередня сторінка', 'Наступна сторінка', 'Сторінка {i}'],
    zh: ['分页', '上一页', '下一页', '第 {i} 页'],
};
texts.no = texts.nb;

customElements.get('u2-pagination') || customElements.define('u2-pagination', U2Pagination);
