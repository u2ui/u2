const EMPTY = rule({});

export class ContentModel {
    #rules;
    #fallback;
    #text;
    #elements;
    #elementNames;
    #elementModels = new Map();
    #exclusions;
    #excludable = new Map();

    constructor({rules = {}, fallback = {}, text = {groups: ['flow', 'phrasing']}, elements = null} = {}) {
        this.#rules = new Map();
        for (const [name, value] of Object.entries(rules)) this.#rules.set(tag(name), rule(value));
        this.#fallback = rule(fallback);
        this.#text = rule(text);
        this.#elementNames = elements === null ? null : tags(elements);
        this.#elements = this.#elementNames && new Set(this.#elementNames);
        // Every token any rule excludes. Ancestor exclusion is the one rule that
        // has to walk, so a child no rule could ever exclude skips the walk.
        const exclusions = new Set();
        for (const item of [...this.#rules.values(), this.#fallback, this.#text]) {
            for (const token of item.exclude) exclusions.add(token);
        }
        this.#exclusions = Object.freeze([...exclusions]);
        Object.freeze(this);
    }

    get elements() { return this.#elementNames; }

    // `localName` is already the lowercase name for HTML elements, so the hot
    // path does no string work at all.
    rule(node) {
        if (typeof node === 'string') return this.#rules.get(tag(node)) || this.#fallback;
        if (node?.nodeType === Node.TEXT_NODE) return this.#text;
        if (node?.nodeType !== Node.ELEMENT_NODE) return EMPTY;
        return this.#rules.get(node.localName) || this.#fallback;
    }

    groups(node) {
        return this.rule(node).groups;
    }

    is(node, group) {
        if (typeof group !== 'string' || !group.trim()) throw new TypeError('A group name must be a non-empty string');
        return this.rule(node).groups.includes(group.toLowerCase());
    }

    // Whether any rule could exclude this kind of child. It depends only on the
    // node's name, so the answer is remembered per name and the ancestor walk in
    // `allows()` is skipped for everything nothing excludes.
    excludable(child) {
        if (!this.#exclusions.length) return false;
        const key = child?.nodeType === Node.ELEMENT_NODE ? child.localName
            : child?.nodeType === Node.TEXT_NODE ? '#text' : null;
        if (key === null) return false;
        let found = this.#excludable.get(key);
        if (found === undefined) {
            found = this.#exclusions.some(token => matches(this, token, child));
            this.#excludable.set(key, found);
        }
        return found;
    }

    block(node) {
        return this.rule(node).block;
    }

    textBlock(node) {
        return this.rule(node).textBlock;
    }

    // The element a container fills itself with: `li` for a list, `tr` for a
    // table section. Structural commands use it instead of naming tags.
    defaultChild(node) {
        return this.rule(node).defaultChild;
    }

    mergeable(node) {
        const current = this.rule(node);
        return current.mergeable ?? current.textBlock;
    }

    atomic(node) {
        const current = this.rule(node);
        return current.atomic || current.void;
    }

    transparent(node) {
        return this.rule(node).transparent;
    }

    allowed(node) {
        if (typeof node === 'string') return !this.#elements || this.#elements.has(tag(node));
        if (node?.nodeType === Node.TEXT_NODE) return true;
        return node?.nodeType === Node.ELEMENT_NODE && (!this.#elements || this.#elements.has(node.localName));
    }

    allows(parent, child) {
        if (!this.allowed(child)) return false;
        const context = transparentParent(this, parent);
        if (!context) return false;
        if (excluded(this, parent, child)) return false;
        const parentRule = this.rule(context);
        if (parentRule.allow) {
            const allowed = parentRule.allow(context, child, this);
            if (allowed !== undefined) return !!allowed;
        }
        return parentRule.children.some(token => matches(this, token, child));
    }

    withElements(elements) {
        if (elements === null && this.#elementNames === null) return this;
        const names = elements === null ? null : tags(elements);
        if (same(names, this.#elementNames)) return this;
        const key = names === null ? '*' : names.join('\u0000');
        let model = this.#elementModels.get(key);
        if (!model) {
            model = this.extend({elements: names});
            this.#elementModels.set(key, model);
        }
        return model;
    }

    extend({rules = {}, fallback, text, elements} = {}) {
        const merged = Object.fromEntries(this.#rules);
        for (const [name, value] of Object.entries(rules)) {
            const key = tag(name);
            if (value === null) delete merged[key];
            else merged[key] = {...(merged[key] || {}), ...value};
        }
        return new ContentModel({
            rules: merged,
            fallback: fallback ? {...this.#fallback, ...fallback} : this.#fallback,
            text: text ? {...this.#text, ...text} : this.#text,
            elements: elements === undefined ? this.#elementNames : elements,
        });
    }
}

function rule(value) {
    if (!value || typeof value !== 'object') throw new TypeError('A content rule must be an object');
    const textBlock = !!value.textBlock;
    return Object.freeze({
        groups: list(value.groups),
        children: list(value.children),
        exclude: list(value.exclude),
        block: !!value.block || textBlock,
        textBlock,
        mergeable: value.mergeable == null ? null : !!value.mergeable,
        atomic: !!value.atomic,
        void: !!value.void,
        transparent: !!value.transparent,
        defaultChild: value.defaultChild == null ? null : tag(value.defaultChild),
        allow: callback(value.allow),
    });
}

function callback(value) {
    if (value == null) return null;
    if (typeof value !== 'function') throw new TypeError('A dynamic content rule must be a function');
    return value;
}

function list(value) {
    if (value === undefined) return Object.freeze([]);
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
        throw new TypeError('Content rule lists must contain strings');
    }
    return Object.freeze([...new Set(value.map(item => item.startsWith('@') ? `@${item.slice(1).toLowerCase()}` : tag(item)))]);
}

function tags(value) {
    if (!Array.isArray(value) || value.some(name => typeof name !== 'string' || !name.trim())) {
        throw new TypeError('Allowed elements must be an array of tag names');
    }
    return Object.freeze([...new Set(value.map(tag))]);
}

function same(left, right) {
    return left === right || !!left && !!right
        && left.length === right.length && left.every((value, index) => value === right[index]);
}

function transparentParent(model, parent) {
    let context = parent;
    while (context && model.transparent(context)) {
        if (typeof context === 'string') return null;
        context = context.parentElement;
    }
    return context;
}

function excluded(model, parent, child) {
    if (typeof parent === 'string' || !model.excludable(child)) return false;
    for (let element = parent; element; element = element.parentElement) {
        if (model.rule(element).exclude.some(token => matches(model, token, child))) return true;
    }
    return false;
}

function matches(model, token, child) {
    if (token.charCodeAt(0) === 64) return model.rule(child).groups.includes(token.slice(1));
    if (token === '*') return child?.nodeType === Node.ELEMENT_NODE || child?.nodeType === Node.TEXT_NODE;
    if (token === '#text') return child?.nodeType === Node.TEXT_NODE;
    return child?.nodeType === Node.ELEMENT_NODE && child.localName === token;
}

function tag(name) {
    if (typeof name !== 'string' || !name.trim()) throw new TypeError('A content rule name must be a non-empty string');
    return name.toLowerCase();
}
