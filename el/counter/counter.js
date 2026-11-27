export default class U2Counter extends HTMLElement {
    constructor() {
        super();

        this._start = 0;
        this._end = Number(this.innerHTML.replaceAll("'",''));

        this.animatedValue = 0;

        this._observer = new IntersectionObserver((entries)=>{
            if (entries[0].isIntersecting) {
                this._animate(this._start, this._end)
                if (this.hasAttribute('once')) this._observer.disconnect();
            } else {
                this._reset();
            }
        });
    }
    static observedAttributes = ['value', 'from', 'no-grouping', 'once'];
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'value') this.value = newValue;
        if (name === 'from') this._start = parseFloat(newValue);
        if (name === 'no-grouping') this.noGrouping = newValue!==null;
    }
    set value(value){
        value = String(value).trim();
        const [, digits = ''] = value.split('.');
        this._minDigits = digits.length;

        this._end = Number(value);
        // todo: recalculate finalWidth
        this._animate(this.animatedValue, this._end);
    }

    connectedCallback() {
        // measure final-width
        this.innerHTML = format(this, this._end);
        const style = getComputedStyle(this);
        const vertical = style.writingMode.includes('vertical');
        const inlineSizePx = vertical ? this.offsetHeight : this.offsetWidth;
        const fontSizePx = parseFloat(style.fontSize);
        const em = inlineSizePx / fontSizePx;
        this.style.setProperty('--js-final-inline-size', em+'em');

        this._reset();
        this._observer.observe(this);
    }
    disconnectedCallback() {
        this._observer.disconnect();
        this._stop();
    }
    _animate(from, to) {
        const duration = 2000;
        let diff = to - from;
        this._stop();
        this.animatedValue = from;
        let start = performance.now();
        this._interval = setInterval(()=>{
            let now = performance.now();
            let progress = Math.min((now - start) / duration, 1);
            this.animatedValue = from + diff * easeOutCubic(progress);
            if (progress >= 1) {
                this.animatedValue = to;
                this._stop();
            }
            this._draw()
        },15)
    }
    _stop() {
        clearInterval(this._interval);
    }
    _reset() {
        this._stop();
        this.animatedValue = this._end;
        this._draw();
    }
    _draw(){
        requestAnimationFrame(()=> this.innerHTML = format(this, this.animatedValue) );
    }
}

// https://easings.net/de
function easeOutCubic(x) {
    return 1 - (1 - x) ** 3;
}

function format(el, val){
    return new Intl.NumberFormat(undefined, {
        style: 'decimal',
        minimumFractionDigits: el._minDigits || 0,
        maximumFractionDigits: el._minDigits || 0,
        useGrouping: !el.noGrouping
    }).format(val);
}

customElements.get('u2-counter') || customElements.define('u2-counter', U2Counter)
