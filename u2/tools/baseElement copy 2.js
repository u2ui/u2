export class BaseElement extends HTMLElement {
    #mutationObserver = null;
    #isFirstConnect = true;
    #isRendering = false;

    static _initBase() {
        this.attributesMap ??= new Map();
        this.propertiesMap ??= new Map();

        const props = this.properties || {};

        for (const [key, options] of Object.entries(props)) {
            // Normalize options
            if (options.attribute === true) options.attribute = key;
            options.property = key;

            this.propertiesMap.set(key, options);

            // Create property getter/setter
            Object.defineProperty(this.prototype, key, {
                get() {
                    return this['_' + key];
                },
                set(value) {
                    const oldValue = this['_' + key];
                    this['_' + key] = value;

                    // Reflect to attribute if needed
                    if (options.attribute && options.reflect) {
                        const attrVal = propToAttr(value, options);
                        attrVal == null ? this.removeAttribute(options.attribute) : this.setAttribute(options.attribute, attrVal);
                    }

                    // Trigger render
                    if (oldValue !== value) {
                        //this.requestUpdate();

                        // Call onChange callback if defined
                        if (options.onChange) {
                            options.onChange.call(this, value, oldValue);
                        }
                    }
                },
                enumerable: true,
                configurable: true
            });

            // Map attribute name to config
            if (options.attribute) {
                this.attributesMap.set(options.attribute, options);
            }

            // Set default value
            if (options.default !== undefined) {
                this.prototype['_' + key] = options.default;
            }
        }

        // Only run once
        this._initBase = null;
    }

    static get observedAttributes() {
        this._initBase?.();
        return [...(this.attributesMap?.keys() || [])];
    }

    static _sheet;

    constructor() {
        super();

        const shadow = this.constructor.shadow;
        if (shadow) {
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = shadow;
        }

        if (this.constructor.css) {
            if (!this.constructor._sheet) {
                const s = new CSSStyleSheet();
                s.replaceSync(this.constructor.css);
                this.constructor._sheet = s;
            }
            this.shadowRoot.adoptedStyleSheets = [this.constructor._sheet];
        }

        this.#wrapLifecycleCallbacks();
    }


    #wrapCallback(name) {
        const originalMethod = Object.getPrototypeOf(this)[name];
        const baseMethod = BaseElement.prototype[name];
        if (originalMethod && originalMethod !== baseMethod) {
            this['_' + 'user' + name[0].toUpperCase() + name.slice(1)] = originalMethod.bind(this);
        }
    }
    #wrapLifecycleCallbacks() {
        this.#wrapCallback('connectedCallback');
        this.#wrapCallback('disconnectedCallback');
        this.#wrapCallback('attributeChangedCallback');
    }

    connectedCallback() {
        // BaseElement Logik IMMER zuerst
        if (typeof this.childrenCallback === 'function') {
            this.#setupMutationObserver();
        }

        if (this.#isFirstConnect && this.firstConnectedCallback) {
            this.firstConnectedCallback();
            this.#isFirstConnect = false;
        }

        this.requestUpdate();

        // Dann Subklassen-Callback falls vorhanden
        if (this._userConnectedCallback) {
            this._userConnectedCallback();
        }
    }

    disconnectedCallback() {
        // BaseElement Cleanup IMMER zuerst
        this.#mutationObserver?.disconnect();

        // Dann Subklassen-Callback falls vorhanden
        if (this._userDisconnectedCallback) {
            this._userDisconnectedCallback();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        // BaseElement Logik IMMER zuerst
        const config = this.constructor.attributesMap?.get(name);
        if (config) {
            const propValue = attrToProp(newValue, config);
            const propName = config.property;
            if (this['_' + propName] !== propValue) {
                this[propName] = propValue;
            }
        }

        // Dann Subklassen-Callback falls vorhanden
        if (this._userAttributeChangedCallback) {
            this._userAttributeChangedCallback(name, oldValue, newValue);
        }
    }

    #setupMutationObserver() {
        this.#mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.childrenCallback(node, 'added');
                        }
                    });

                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.childrenCallback(node, 'removed');
                        }
                    });
                }
            }
        });
        this.#mutationObserver.observe(this, { childList: true, subtree: false });
    }

    // Render scheduling
    requestUpdate() {
        if (this.#isRendering) return;
        this.#isRendering = true;

        requestAnimationFrame(() => {
            this.#isRendering = false;
            if (this.render) { this.render(); }
        });
    }

    // Helper: Query im Shadow DOM
    $(selector) { return this.shadowRoot?.querySelector(selector); }
    $$(selector) { return this.shadowRoot?.querySelectorAll(selector); }

    // Helper: Dispatch Custom Event
    emit(eventName, detail = null, options = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true,
            ...options
        });
        return this.dispatchEvent(event);
    }

    // Helper: Locales für Internationalisierung
    locales() {
        const langEl = this.closest('[lang]') || document.documentElement;
        return Intl.getCanonicalLocales([langEl.lang, ...navigator.languages, 'en']);
    }
}

// Type conversion helpers
function attrToProp(value, { type }) {
    if (type === Boolean) return value != null;
    if (type === Number) return value ? parseFloat(value) : 0;
    if (type === 'tokens') return new Set(value?.split(' ') || []);
    return value;
}

function propToAttr(value, { type }) {
    if (type === Boolean) return value ? '' : null;
    if (type === Number) return String(value);
    if (type === 'tokens') return [...value].join(' ');
    if (value == null) return null;
    return String(value);
}