import {MarkAdapter} from './dom-adapter.js';
import {MarkType} from './mark.js';

const LINK_ATTRIBUTES = ['href', 'target', 'rel', 'title'];

export const bold = new MarkType('bold');
export const italic = new MarkType('italic');
export const underline = new MarkType('underline');
export const strike = new MarkType('strike');
export const code = new MarkType('code');
export const link = new MarkType('link');

export const boldHtml = element(bold, 'strong, b', 'strong');
export const italicHtml = element(italic, 'em, i', 'em');
export const underlineHtml = element(underline, 'u', 'u');
export const strikeHtml = element(strike, 's, strike', 's');
export const codeHtml = element(code, 'code', 'code');
export const linkHtml = new MarkAdapter(link, {
    selector: 'a[href]',
    tag: 'a',
    read: readLink,
    write: writeLink,
    clear: clearLink,
});

function element(type, selector, tag) {
    return new MarkAdapter(type, {selector, tag, clear: () => true});
}

function readLink(element) {
    const value = {};
    for (const name of LINK_ATTRIBUTES) {
        if (element.hasAttribute(name)) value[name] = element.getAttribute(name);
    }
    return value;
}

function writeLink(element, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || typeof value.href !== 'string'
        || Object.keys(value).some(name => !LINK_ATTRIBUTES.includes(name) || typeof value[name] !== 'string')) {
        throw new TypeError('A link mark requires href and optional target, rel, and title strings');
    }
    for (const name of LINK_ATTRIBUTES) if (value[name] !== undefined) element.setAttribute(name, value[name]);
}

function clearLink(element) {
    for (const name of LINK_ATTRIBUTES) element.removeAttribute(name);
    return true;
}
