export class BaseElement extends HTMLElement {

    constructor() {
        super();
        if (typeof this.childListChangedCallback === 'function') {
            this.mutationObserver = new MutationObserver((mutations) => {
                this.childListChangedCallback(mutations);
            });
        }
    }
    connectedCallback() {
        this.mutationObserver?.observe(this, {childList:true});
        this.scheduleRender();
    }
    disconnectedCallback() {
        this.mutationObserver?.disconnect();
    }

    static _initBase() {
        this.attributesMap ??= new Map();
        this.propertiesMap ??= new Map();

        for (const [key, options] of Object.entries(this.properties)) {
            this.propertiesMap.set(key, options);
            Object.defineProperty(this.prototype, key, {
                get() {
                    return this['_' + key];
                },
                set(value) {
                    this['_' + key] = value;
                    if (options.attribute) {
                        const attrVal = propToAttr(value, options);
                        attrVal === null ? this.removeAttribute(key) : this.setAttribute(key, attrVal);
                    }
                    this.requestUpdate();
                }
            });
            if (options.attribute) this.attributesMap.set(key, options);
        }

        this._initBase = null;
    }


    static get observedAttributes() {
        this._initBase?.();
        return [...this.attributesMap.keys()];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        const config = this.constructor.attributesMap.get(name);
        //this[name] = attrToProp(newValue, config);
        const propValue = attrToProp(newValue, config);
        if (this['_'+name] !== propValue) this[name] = propValue;
    }

    requestUpdate() {
        this.scheduledRender();
    }

    scheduledRender() {
        if ( this._isRendering ) return;
        this._isRendering = true;
        requestAnimationFrame(() => {
            this._isRendering = false;
            this.render();
        });
    }

    // todo? for tables i should check col and colgroup
    // https://www.w3.org/TR/1999/REC-html401-19991224/struct/tables.html#alignment-inheritance
    locales() {
        let langEl = this.closest('[lang]')||document.documentElement;
        return Intl.getCanonicalLocales([langEl.lang, ...navigator.languages,'en']);
    }
}



function attrToProp(value, {type}) {
    if (type === 'boolean') return value != null;
    if (type === 'number') return parseFloat(value);
    if (type === 'tokens') return new Set(value.split(' '));
    return value;
}
function propToAttr(value, {type}) {
    if (type === 'boolean') return value ? '' : null;
    if (type === 'number') return value.toString();
    if (type === 'tokens') return [...value].join(' ');
    return String(value);
}