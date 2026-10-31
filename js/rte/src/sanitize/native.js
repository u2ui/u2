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
        template.setHTML(html, {sanitizer: {
            removeElements: this.policy.removeElements,
            attributes: this.policy.attributeNames,
            comments: this.policy.comments,
            dataAttributes: this.policy.dataAttributes,
        }});
        // An element allowlist would make the sink drop the rest with their text; narrow() unwraps it.
        this.policy.narrow(template.content, {elements: options.elements ?? null});
        return this.policy.clean(template.content, {
            base: options.base ?? document.baseURI,
            classes: options.classes ?? null,
        });
    }
}
