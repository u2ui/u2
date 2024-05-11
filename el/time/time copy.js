
class Time extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.outEl = this.shadowRoot;
    }
    connectedCallback() {
        this.reset();
    }
    disconnectedCallback() {
        clearInterval(this.__timer);
    }
    static  observedAttributes = ['datetime', 'lang', 'type', 'weekday', 'year', 'month', 'day', 'hour', 'minute', 'second', 'mode'];
    attributeChangedCallback(name, old, value) {
        if (old === value) return;
        this.reset();
    }
    reset() {
        this.__type = this.getAttribute('type') || 'relative';
        let show = this.getAttribute('type') || this.innerHTML === '';
        if (!show) return;

        let date = this.getAttribute('datetime');
        date = date.match(/^-?[0-9.]+$/) ? Number(date) : Date.parse(date);
        date = new Date(date);
        this.__date = date;

        this.__lang = langFromElement(this) || 'default';
        this.render();
    }
    render() {
        let content = '';
        let title = '';

        let date = this.__date;

        const valid = !isNaN(date);
        if (valid) {
            let fn = types[this.__type];
            if (!fn) { console.warn('type ' + this.__type + ' is not supported'); return; }
            let {show} = fn(this, date);
            content = show;
            if (this.__type === 'relative') {
                title = types['date'](this, date).show;// provide a title-attribute if it is relative
                clearInterval(this.__timer);
                this.__timer = setTimeout(() => this.render(), 1000); // todo: evaluate exact next tic, challange!
            }
        }
        this.outEl.innerHTML = `<time datetime="${this.getAttribute('datetime')}" title="${title}">${content}<slot hidden="${valid}"/></time>`;
    }
}


const types = {
    relative(el, date) {
        const mode = el.getAttribute('mode') || 'long';
        const rtf = new Intl.RelativeTimeFormat(el.__lang, {
            //localeMatcher: , // 'best fit', 'lookup'
            numeric: 'auto', // always, auto
            style: mode // long, narrow, short
        });
        const now = Date.now();
        const elapsed = date - now;
        const { unit, rounded } = elapsedToUnit(elapsed);
        return {
            show:rtf.format(rounded, unit),
        }
    },
    date(el, date) {
        const defaults = {
            weekday: { default: 'short', showAnyway: 1 },      // "narrow", "short", "long".
            //era:                                             // "narrow", "short", "long".
            year: { default: 'numeric', showAnyway: 1 },       // "numeric", "2-digit".
            month: { default: 'short', showAnyway: 1 },        // "numeric", "2-digit", "narrow", "short", "long".
            day: { default: 'numeric', showAnyway: 1 },        // "numeric", "2-digit".
            hour: { default: 'numeric', showAnyway: 0 },       // "numeric", "2-digit".
            minute: { default: 'numeric', showAnyway: 0 },     // "numeric", "2-digit".
            second: { default: 'numeric', showAnyway: 0 },     // "numeric", "2-digit".
            timeZoneName: { default: 'short', showAnyway: 0 }, // "short", "long".
        };
        const options = {};
        for (let [key, opts] of Object.entries(defaults)) {
            const val = el.getAttribute(key);
            if (val === null) {
                if (opts.showAnyway) options[key] = opts.default;
                continue;
            }
            else if (val === '' || val === 'true') options[key] = opts.default;
            else if (val === 'none') options[key] = undefined;
            else options[key] = val;
        }
        if (options.second && !options.minute) options.minute = options.second;
        if (options.minute && !options.hour) options.hour = options.minute;
        
        const formatter = new Intl.DateTimeFormat(el.__lang, options);
        // let html = '';
        // for (const part of formatter.formatToParts(date)) {
        //     html += `<span part="${part.type}">${part.value}</span>`;
        // }

        return {
            //html: formatter.formatToParts(date).map(part => `<span part="${part.type}">${part.value}</span>`).join(''),
            show: formatter.format(date),
        }
    },
}

function langFromElement(el) {
    let langEl = el.closest('[lang]')||document.documentElement;
    // todo: for tables i should check col and colgroup
    // https://www.w3.org/TR/1999/REC-html401-19991224/struct/tables.html#alignment-inheritance

    // let list = navigator.languages;
    // try {
    //     list = Intl.getCanonicalLocales(lang);
    // } catch (e) {}
    // Intl.NumberFormat(list).format();
    return langEl.lang || navigator.language;
}

function elapsedToUnit(elapsed, min = 'second') {
    for (let unit in units)
        if (Math.abs(elapsed) > units[unit] || unit === min) {
            return {
                unit,
                rounded: Math.round(elapsed / units[unit]),
            };
        }
}
const units = {
    year: 24 * 60 * 60 * 1000 * 365,
    month: 24 * 60 * 60 * 1000 * 365 / 12,
    day: 24 * 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    minute: 60 * 1000,
    second: 1000
}


customElements.define('u2-time', Time);
