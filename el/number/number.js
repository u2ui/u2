
class U2Number extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        // this.shadowRoot.innerHTML = `<span id=out></span>`;
        // this.outEl = this.shadowRoot.getElementById('out');
        this.outEl = this.shadowRoot;
        this.observer = new MutationObserver(mutations => this.render());
    }
    connectedCallback() {
        this.render();
        this.observer.observe(this, {childList: true, characterData: true});
    }
    disconnectedCallback() {
        this.observer.disconnect();
    }
    render() {
        let value = this.hasAttribute('value') ? this.getAttribute('value') : this.innerHTML;
        value = value.trim();
        if (value==='') return this.outEl.innerHTML = '-';
        value = parseFloat(value);

        const digits = this.getAttribute('digits') ?? undefined;
        const unit = this.getAttribute('unit') ?? undefined;
        const currency = this.getAttribute('currency') ?? undefined;
        const percent = this.hasAttribute('percent');

        const options = {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
            unit,
            currency,
        };
        if (unit) options.style = 'unit';
        if (currency) options.style = 'currency';
        if (percent) options.style = 'percent';

        const locales = localesFromElement(this);
        const formatter = new Intl.NumberFormat(locales, options);

        let html = '';
        for (const part of formatter.formatToParts(value)) {
            html += `<span part="${part.type}">${part.value}</span>`;
        }

        this.outEl.innerHTML = html;
    }
    static observedAttributes = ['value', 'lang', 'digits', 'unit', 'currency', 'percent'];

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return;
        this.render();
    }
    set value(val) {
        this.setAttribute('value', val);
    }
    get value() {
        return this.getAttribute('value');
    }
}

customElements.define('u2-number', U2Number);


// todo: for tables i should check col and colgroup
// https://www.w3.org/TR/1999/REC-html401-19991224/struct/tables.html#alignment-inheritance
// let list = navigator.languages;
// try {
//     list = Intl.getCanonicalLocales(lang);
// } catch (e) {}
// Intl.NumberFormat(list).format();
function localesFromElement(el) {
    let langEl = el.closest('[lang]')||document.documentElement;
    const locale = langEl.lang || navigator.language;
    return [locale, ...navigator.languages];
}
