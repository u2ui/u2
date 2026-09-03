import {elementPresets} from '../config/config.js';

const NAME = /^[a-z][a-z\d-]*$/;
const ATTRIBUTE = /^[a-z][a-z\d_.:-]*$/;
const PROTOCOL = /^[a-z][a-z\d+.-]*$/;
const URL_ATTRIBUTES = new Set(['action', 'cite', 'formaction', 'href', 'poster', 'src', 'xlink:href']);
const DEFAULT_ATTRIBUTES = Object.freeze({
    '*': Object.freeze(['class', 'dir', 'lang', 'title']),
    a: Object.freeze(['href', 'rel', 'target']),
    blockquote: Object.freeze(['cite']),
    img: Object.freeze(['alt', 'height', 'loading', 'src', 'width']),
    li: Object.freeze(['value']),
    ol: Object.freeze(['reversed', 'start', 'type']),
    q: Object.freeze(['cite']),
    td: Object.freeze(['colspan', 'headers', 'rowspan']),
    th: Object.freeze(['abbr', 'colspan', 'headers', 'rowspan', 'scope']),
    time: Object.freeze(['datetime']),
});
const DEFAULT_PROTOCOLS = Object.freeze({
    a: Object.freeze({href: Object.freeze(['http', 'https', 'mailto', 'relative', 'tel'])}),
    blockquote: Object.freeze({cite: Object.freeze(['http', 'https', 'relative'])}),
    // `data:` belongs to an image and to nothing else here: an image executes
    // nothing, not even an SVG one, which browsers draw in a script-free
    // context. In a navigating attribute the same protocol is a page, so `a`
    // and the citations keep it out.
    img: Object.freeze({src: Object.freeze(['data', 'http', 'https', 'relative'])}),
    q: Object.freeze({cite: Object.freeze(['http', 'https', 'relative'])}),
});

// Elements a browser never renders the children of. Unwrapping one turns source — a stylesheet, a
// script, document metadata — into visible text, so these go with their content. Every other unknown
// element keeps its content: dropping it would lose text the author wrote.
const DEFAULT_DROP = Object.freeze([
    'base', 'head', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title',
]);

export const sanitizeDefaults = Object.freeze({
    elements: elementPresets.document,
    attributes: DEFAULT_ATTRIBUTES,
    protocols: DEFAULT_PROTOCOLS,
    drop: DEFAULT_DROP,
    comments: false,
    dataAttributes: false,
});

export class SanitizePolicy {
    #attributes;
    #protocols;

    constructor(options = {}) {
        this.elements = names(options.elements ?? sanitizeDefaults.elements, NAME, 'element');
        this.drop = names(options.drop ?? sanitizeDefaults.drop, NAME, 'element');
        this.#attributes = groups(options.attributes ?? sanitizeDefaults.attributes, ATTRIBUTE, 'attribute');
        this.#protocols = protocolGroups(options.protocols ?? sanitizeDefaults.protocols);
        this.attributeNames = Object.freeze(unique(Object.values(this.#attributes).flat()));
        this.comments = boolean(options.comments ?? sanitizeDefaults.comments, 'comments');
        this.dataAttributes = boolean(options.dataAttributes ?? sanitizeDefaults.dataAttributes, 'dataAttributes');
        Object.freeze(this);
    }

    allowsAttribute(element, attribute) {
        const name = element.localName.toLowerCase();
        const attributeName = attribute.toLowerCase();
        if (this.dataAttributes && attributeName.startsWith('data-')) return true;
        return this.#attributes['*']?.includes(attributeName)
            || this.#attributes[name]?.includes(attributeName)
            || false;
    }

    allowsUrl(element, attribute, value, base = element.ownerDocument?.baseURI) {
        const attributeName = attribute.toLowerCase();
        if (!URL_ATTRIBUTES.has(attributeName)) return true;
        const protocols = this.#protocols[element.localName.toLowerCase()]?.[attributeName]
            || this.#protocols['*']?.[attributeName];
        if (!protocols) return false;
        const protocol = urlProtocol(value, base);
        return protocol !== null && protocols.includes(protocol);
    }

    // Reduces a subtree to the elements this policy allows, keeping the content
    // of the rest — except the `drop` elements, which go with theirs. Parsed input
    // gets this from the safe sink; markup the browser inserted itself has to be
    // narrowed afterwards.
    //
    // `skip` leaves an element to a later stage. Structural repair already
    // removes what the content model rejects, and it does so knowing that
    // dissolving a block into inline content needs a line break to survive.
    // A `drop` element is not that kind of question — no later stage may keep
    // its content — so it goes before `skip` is asked.
    //
    // `alias` names an equivalent for an element that is not allowed. Dropping
    // `<b>` would lose the emphasis it carries, so a strict list can still keep
    // the meaning by taking the canonical element instead.
    narrow(root, {elements = null, preserve = null, map = null, skip = null, alias = null} = {}) {
        // A caller may narrow further but never past the policy itself.
        const allowed = elements === null
            ? this.elements
            : this.elements.filter(name => elements.includes(name));
        const changed = [];
        for (const element of descendants(root).reverse()) {
            if (preserve?.has(element) || !element.parentNode) continue;
            if (this.drop.includes(element.localName)) {
                if (map) map.remove(element);
                else element.remove();
                changed.push(element);
                continue;
            }
            if (skip?.(element) || allowed.includes(element.localName)) continue;
            const equivalent = alias?.[element.localName];
            if (equivalent && allowed.includes(equivalent)) {
                const replacement = element.ownerDocument.createElement(equivalent);
                for (const attribute of element.attributes) replacement.setAttribute(attribute.name, attribute.value);
                if (map) map.replaceWrapper(element, replacement);
                else {
                    replacement.append(...element.childNodes);
                    element.replaceWith(replacement);
                }
                changed.push(replacement);
                continue;
            }
            if (map) map.unwrap(element);
            else element.replaceWith(...element.childNodes);
            changed.push(element);
        }
        return changed;
    }

    // `classes` narrows the class attribute to known names without touching the
    // security policy: an application declares its content classes once and
    // foreign ones do not survive external input.
    clean(root, {base, classes = null, preserve = null} = {}) {
        const known = classes === null ? null : new Set(classes);
        for (const element of descendants(root)) {
            if (preserve?.has(element)) continue;
            for (const attribute of [...element.attributes]) {
                if (!this.allowsAttribute(element, attribute.name)
                    || !this.allowsUrl(element, attribute.name, attribute.value, base)) {
                    element.removeAttributeNode(attribute);
                } else if (known && attribute.name.toLowerCase() === 'class') {
                    keepClasses(element, known);
                }
            }
        }
        return root;
    }
}

export const sanitizePolicy = new SanitizePolicy();

function names(values, pattern, label) {
    if (!values || typeof values[Symbol.iterator] !== 'function' || typeof values === 'string') {
        throw new TypeError(`${label} names must be an iterable`);
    }
    const result = [];
    for (const value of values) {
        const name = String(value).toLowerCase();
        if (!pattern.test(name)) throw new TypeError(`Invalid ${label} name: ${value}`);
        if (!result.includes(name)) result.push(name);
    }
    return Object.freeze(result);
}

function groups(value, pattern, label) {
    if (!plainObject(value)) throw new TypeError(`${label} groups must be an object`);
    const result = {};
    for (const [name, values] of Object.entries(value)) {
        const key = name === '*' ? name : names([name], NAME, 'element')[0];
        result[key] = names(values, pattern, label);
    }
    return Object.freeze(result);
}

function protocolGroups(value) {
    if (!plainObject(value)) throw new TypeError('protocol groups must be an object');
    const result = {};
    for (const [element, attributes] of Object.entries(value)) {
        const name = element === '*' ? element : names([element], NAME, 'element')[0];
        if (!plainObject(attributes)) throw new TypeError('protocol attributes must be an object');
        const rules = {};
        for (const [attribute, protocols] of Object.entries(attributes)) {
            const attributeName = names([attribute], ATTRIBUTE, 'attribute')[0];
            const values = names(protocols, PROTOCOL, 'protocol');
            rules[attributeName] = values;
        }
        result[name] = Object.freeze(rules);
    }
    return Object.freeze(result);
}

function urlProtocol(value, base) {
    const input = String(value).trim();
    const compact = input.replace(/[\u0000-\u0020]/g, '');
    if (!/^[a-z][a-z\d+.-]*:/i.test(compact)) return 'relative';
    try {
        return new URL(input, base).protocol.slice(0, -1).toLowerCase();
    } catch {
        return null;
    }
}

function keepClasses(element, known) {
    const kept = [...element.classList].filter(name => known.has(name));
    if (kept.length === element.classList.length) return;
    if (kept.length) element.setAttribute('class', kept.join(' '));
    else element.removeAttribute('class');
}

function descendants(root) {
    const result = root.nodeType === Node.ELEMENT_NODE ? [root] : [];
    return result.concat([...root.querySelectorAll('*')]);
}

function unique(values) {
    return [...new Set(values)];
}

function boolean(value, name) {
    if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean`);
    return value;
}

function plainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}
