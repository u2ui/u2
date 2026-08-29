import {Mark, MarkType} from './mark.js';

const TRUE = () => true;

export class MarkAdapter {
    #type;
    #selector;
    #read;
    #render;
    #write;
    #clear;
    #reuse;

    constructor(type, {selector, tag, read = TRUE, write, clear, reuse = false, render} = {}) {
        if (!(type instanceof MarkType)) throw new TypeError('A mark adapter requires a mark type');
        if (typeof selector !== 'string' || !selector.trim()) {
            throw new TypeError('A mark adapter requires a non-empty selector');
        }
        if (typeof read !== 'function') throw new TypeError('A mark reader must be a function');
        if (write !== undefined && typeof write !== 'function') throw new TypeError('A mark writer must be a function');
        if (clear !== undefined && typeof clear !== 'function') throw new TypeError('A mark clearer must be a function');
        if (typeof reuse !== 'boolean' && typeof reuse !== 'function') {
            throw new TypeError('Mark reuse must be a boolean or function');
        }
        if (reuse && !write) throw new TypeError('A reusable mark adapter requires write');
        if (render !== undefined && typeof render !== 'function') throw new TypeError('A mark renderer must be a function');
        if (render && tag !== undefined) throw new TypeError('A custom mark renderer cannot be combined with tag');
        if (!render && (typeof tag !== 'string' || !/^[a-z][a-z0-9-]*$/.test(tag))) {
            throw new TypeError('A mark adapter requires a lowercase HTML tag');
        }
        this.#type = type;
        this.#selector = selector.trim();
        this.#read = read;
        this.#write = write;
        this.#clear = clear;
        this.#reuse = reuse;
        this.#render = render || ((document, value) => {
            const element = document.createElement(tag);
            write?.(element, value);
            return element;
        });
    }

    get type() { return this.#type; }
    get selector() { return this.#selector; }
    get reusable() { return !!this.#reuse; }
    get removable() { return !!this.#clear; }

    parse(element) {
        assertElement(element);
        if (!element.matches(this.#selector)) return null;
        const value = this.#read(element);
        return value === undefined ? null : this.#type.create(value);
    }

    canReuse(element) {
        assertElement(element);
        return this.#reuse === true || !!this.#reuse && !!this.#reuse(element);
    }

    apply(element, mark) {
        this.#assertMark(mark);
        assertElement(element);
        if (!this.#write) throw new TypeError('This mark adapter cannot decorate an existing element');
        this.#write(element, mark.value);
        return element;
    }

    clear(element, mark) {
        this.#assertMark(mark);
        assertElement(element);
        if (!this.#clear) throw new TypeError('This mark adapter cannot remove its formatting');
        this.#clear(element, mark.value);
        for (const name of ['class', 'style']) {
            if (!element.getAttribute(name)?.trim()) element.removeAttribute(name);
        }
        return element.localName === 'span' && !element.attributes.length;
    }

    render(mark, document) {
        this.#assertMark(mark);
        if (document?.nodeType !== Node.DOCUMENT_NODE) throw new TypeError('Mark rendering requires a document');
        const element = this.#render(document, mark.value);
        assertElement(element);
        if (element.ownerDocument !== document || element.parentNode || element.childNodes.length) {
            throw new TypeError('A rendered mark must be an empty detached element from the requested document');
        }
        return element;
    }

    #assertMark(mark) {
        if (!(mark instanceof Mark) || mark.type !== this.#type) {
            throw new TypeError('A mark adapter can only use its own mark type');
        }
    }
}

function assertElement(element) {
    if (element?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('A mark adapter requires an element');
}
