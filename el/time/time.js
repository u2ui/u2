
class Time extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `<time><span id=out></span><slot id=fallback></slot></time>`;
        this._timeEl = this.shadowRoot.querySelector('time');
        this._outEl = this.shadowRoot.getElementById('out');
        this._fallbackEl = this.shadowRoot.getElementById('fallback');
    }
    connectedCallback() {
        this.reset();
    }
    disconnectedCallback() {
        clearTimeout(this.__timer);
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


        
        const string = this.getAttribute('datetime');

        // const datetimeRegex = /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([-+]\d{2}:?\d{2}))?)?)?)?$/;
        // const match = string.match(datetimeRegex);
        // if (match) {
        //     this._representation = 'datetime';
        // } else if (string.match(/^\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/)) {
        //     this._representation = 'time';
        //     this._
        // } else if (string.match(/^\d{4}-\d{2}$/)) {
        //     this._representation = 'yearless-date';
        // } else if (string.match(/^P/)) {
        //     this._representation = 'duration'; // eg PT4H18M3S
        // }


        let date = string.match(/^-?\d{5,}$/) ? Number(string) : Date.parse(string);

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
            const relativeData = types['relative'](this, date);
            const absoluteData = types['date'](this, date);
            content = this.__type === 'relative' ? relativeData.show : absoluteData.show;
            title = this.__type === 'relative' ? absoluteData.show : relativeData.show;
            clearTimeout(this.__timer);
            if (relativeData.nextUpdateIn < 2 * 60 * 60 * 1000) {
                this.__timer = setTimeout(() => this.render(), relativeData.nextUpdateIn + 100);
            }
        }
        this._timeEl.setAttribute('datetime', this.getAttribute('datetime'));
        this._timeEl.setAttribute('title', title);
        if (content !== this._outEl.innerHTML) this._outEl.innerHTML = content;
        this._fallbackEl.hidden = valid;
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
        const { unit, rounded, nextUpdateIn } = elapsedToUnit(elapsed);
        return {
            show:rtf.format(rounded, unit),
            nextUpdateIn
        };
    },
    date(el, date) {
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
            const rounded = Math.round(elapsed / units[unit]);
            const nextUpdateIn = units[unit] - (elapsed % units[unit]);
            return {
                unit,
                rounded,
                nextUpdateIn
            };
        }
}

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

const units = {
    year: 24 * 60 * 60 * 1000 * 365,
    month: 24 * 60 * 60 * 1000 * 365 / 12,
    day: 24 * 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    minute: 60 * 1000,
    second: 1000
}


customElements.define('u2-time', Time);
