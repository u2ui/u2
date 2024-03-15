import 'https://unpkg.com/uce@1.16.5/new.js';
const { define, html } = customElements.get('uce-lib');

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
            var val = el.getAttribute(key);
            if (val === null) {
                if (opts.showAnyway) options[key] = opts.default;
                continue;
            }
            else if (val === '' || val === 'true') options[key] = opts.default;
            else if (val === 'none') options[key] = undefined;
            else options[key] = val;
        }
        return {
            show: new Intl.DateTimeFormat(el.__lang, options).format(date)
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
            let rounded = Math.round(elapsed / units[unit]);
            return {
                unit,
                rounded,
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


define('u1-time', {
    attachShadow: { mode: 'open' },

    render() {
        let content = '';
        let title = undefined;

        let date = this.__date;

        var valid = !isNaN(date);
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
        this.html`<time datetime="${this.props.datetime}" title="${title}">${content}<slot hidden="${valid}"/></time>`;
    },
    reset() {
        this.__type = this.props.type || 'relative';
        let show = this.props.type || this.innerHTML === '';
        if (!show) return;

        let date = this.props.datetime;
        date = date.match(/^-?[0-9.]+$/) ? Number(date) : Date.parse(date);
        date = new Date(date);
        this.__date = date;

        this.__lang = langFromElement(this) || 'default';
        this.render();
    },
    observedAttributes: ['datetime', 'lang', 'type', 'weekday', 'year', 'month', 'day', 'hour', 'minute', 'second', 'mode'],

    attributeChanged(name, old, value) {
        if (!this.realConnected) return;
        if (old === value) return;
        this.reset();
    },
    connected() {
        this.realConnected = true;
        this.reset();
    },
    disconnected() { clearInterval(this.__timer); },
});
