import {sanitizePolicy} from './policy.js';

export class NativeSanitizer {
    constructor(policy = sanitizePolicy) {
        if (!policy || !Array.isArray(policy.elements)
            || !Array.isArray(policy.attributeNames) || typeof policy.clean !== 'function') {
            throw new TypeError('A sanitize policy is required');
        }
        this.policy = policy;
        Object.freeze(this);
    }

    static supported(document = globalThis.document) {
        return typeof document?.createElement?.('template').setHTML === 'function';
    }

    sanitize(html, options = {}) {
        const document = options.document ?? globalThis.document;
        const template = document?.createElement?.('template');
        if (typeof template?.setHTML !== 'function') {
            throw new DOMException('Element.setHTML() is not available', 'NotSupportedError');
        }
        template.setHTML(html, {sanitizer: config(this.policy, options.elements)});
        return this.policy.clean(template.content, {base: options.base ?? document.baseURI});
    }
}

function config(policy, elements) {
    const selected = elements == null ? null : new Set(elements.map(name => name.toLowerCase()));
    const allowed = selected ? policy.elements.filter(name => selected.has(name)) : policy.elements;
    const replaced = selected ? policy.elements.filter(name => !selected.has(name)) : [];
    const result = {
        elements: allowed,
        attributes: policy.attributeNames,
        comments: policy.comments,
        dataAttributes: policy.dataAttributes,
    };
    if (replaced.length) result.replaceWithChildrenElements = replaced;
    return result;
}
