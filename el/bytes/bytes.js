
class Bytes extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
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
        let value = this.value;
        if (value === null) return this.outEl.innerHTML = '-';

        const digits = this.getAttribute('digits') || 3;
        const locales = localesFromElement(this);
        const formatter = new Intl.NumberFormat(locales, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
            maximumSignificantDigits: digits,
        });

        const {number, compact, unit, space} = convertBytes(value, {useBinaryUnits: false, locale: locales[0]});
        let html = formatter.formatToParts(number).map(part => `<span part="${part.type}">${part.value}</span>`).join('');
        if (space !== '') html += `<span part="literal">${space}</span>`;
        html += `<span part="compact">${compact}</span>`;
        html += `<span part="unit">${unit}</span>`;

        this.outEl.innerHTML = html;
    }
    static observedAttributes = ['digits','value','lang'];

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return;
        this.render();
    }
    set value(val) {
        this.setAttribute('value', val);
    }
    get value() {
        let value = this.getAttribute('value') ?? this.innerHTML;
        value = value.trim();
        if (value==='') return null;
        return parseFloat(value);
    }
}

customElements.define('u2-bytes', Bytes);


function localesFromElement(el) {
    let langEl = el.closest('[lang]')||document.documentElement;
    const locale = langEl.lang || navigator.language;
    return [locale, ...navigator.languages];
}

function convertBytes(bytes, options) {
    const { binary = false } = options;

    const locale = options.locale || 'en';
    const lang = locale.substring(0, 2);
    
    const base = binary ? 1024 : 1000;
    let compact = binary ?  ["", "Ki", "Mi", "Gi", "Ti", "Pi", "Ei", "Zi", "Yi"] : ["", "k", "M", "G", "T", "P", "E", "Z", "Y"];
    // kyrillisch
    if (lang === 'ru' || lang === 'uk' || lang === 'be') {
        compact = binary ? ["", "Ки", "Ми", "Ги", "Ти", "Пи", "Эи", "Зи", "Йи"] : ["", "к", "М", "Г", "Т", "П", "Э", "З", "Й"];
    }

    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(base));

    let unit = 'B';
    if (i === 0) {
        unit = 'byte';
        if (lang === 'de') unit = 'Byte';
    }
    if (lang === 'fr') unit = 'o';
    if (lang === 'ru') unit = 'б';
    
    let space = '\u00A0'; // nbsp
    if (lang === 'fr') space = '\u202f';
    if (lang === 'jp') space = '';
    if (lang === 'cn') space = '';
    if (lang === 'zh') space = '';
  
    return {
        number: bytes / Math.pow(base, i),
        space: space,
        compact: compact[i],
        unit: unit,
    };
}