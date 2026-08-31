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
    img: Object.freeze({src: Object.freeze(['http', 'https', 'relative'])}),
    q: Object.freeze({cite: Object.freeze(['http', 'https', 'relative'])}),
});

export const sanitizeDefaults = Object.freeze({
    elements: elementPresets.document,
    attributes: DEFAULT_ATTRIBUTES,
    protocols: DEFAULT_PROTOCOLS,
    comments: false,
    dataAttributes: false,
});

export class SanitizePolicy {
    #attributes;
    #protocols;

    constructor(options = {}) {
        this.elements = names(options.elements ?? sanitizeDefaults.elements, NAME, 'element');
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

    // `classes` narrows the class attribute to known names without touching the
    // security policy: an application declares its content classes once and
    // foreign ones do not survive external input.
    clean(root, {base, classes = null} = {}) {
        const known = classes === null ? null : new Set(classes);
        for (const element of descendants(root)) {
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
