import {htmlModel} from '../model/html/html-model.js';
import {narrow} from '../command/edit.js';
import {NativeSanitizer} from '../sanitize/native.js';
import {SelectionSnapshot} from '../selection/snapshot.js';
import {replaceContent} from '../surface/content.js';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

// Reads and writes one surface's content as HTML text.
//
// Reading serializes the live DOM and reports where the current selection falls
// in that text, so a source view can open exactly where the caret is. It walks
// the DOM instead of post-processing a string, so it cannot invent markup, and
// it never mutates the surface to place markers.
//
// Writing is the only path that turns text back into content, and it always
// goes through the configured sanitizer: source text is external input even
// when the same user just read it out.
export class Source {
    #surface;
    #sanitizer;
    #indent;

    constructor(surface, {sanitizer = new NativeSanitizer(), indent = '    '} = {}) {
        if (surface?.element?.nodeType !== Node.ELEMENT_NODE || typeof surface?.transact !== 'function') {
            throw new TypeError('A source view requires an editor surface');
        }
        if (typeof sanitizer?.sanitize !== 'function') throw new TypeError('A source view requires a sanitizer');
        if (typeof indent !== 'string' || indent.trim()) throw new TypeError('Source indentation must be whitespace');
        this.#surface = surface;
        this.#sanitizer = sanitizer;
        this.#indent = indent;
    }

    get surface() { return this.#surface; }
    get sanitizer() { return this.#sanitizer; }

    // `{html, start, end}`. The offsets point into `html`, or are null when the
    // surface does not currently own a selection.
    read() {
        const root = this.#surface.element;
        const snapshot = SelectionSnapshot.capture(this.#surface.core.selection, root) || this.#surface.selection;
        const range = snapshot?.valid() ? snapshot.range() : null;
        const marks = range ? [
            {node: range.startContainer, offset: range.startOffset},
            {node: range.endContainer, offset: range.endOffset},
        ] : [];
        const writer = new Writer(this.#model(), this.#indent, marks, node => this.#surface.core.retains(node));
        writer.children(root, 0);
        // The outermost separated level wraps the whole document; that first and
        // last break are framing, not content.
        const lead = writer.text.startsWith('\n') ? 1 : 0;
        const html = writer.text.slice(lead).replace(/\n$/, '');
        const clamp = value => value === null ? null : Math.min(Math.max(value - lead, 0), html.length);
        const [start = null, end = null] = writer.offsets;
        return {html, start: clamp(start), end: clamp(end)};
    }

    // Replaces the whole content and returns the inserted nodes.
    write(html) {
        if (typeof html !== 'string') throw new TypeError('Source must be written as a string');
        const root = this.#surface.element;
        const settings = this.#surface.config;
        const fragment = this.#sanitizer.sanitize(html, {
            document: root.ownerDocument,
            elements: settings.elements ?? undefined,
            classes: settings.classes.length ? settings.classes : null,
        });
        // The breaks between blocks are what reading added for legibility; they
        // are not content and must not return as text nodes.
        prune(fragment, this.#model());
        const nodes = [...fragment.childNodes];
        this.#surface.transact(transaction => {
            replaceContent(this.#surface, fragment);
            transaction.touch(root);
            const range = root.ownerDocument.createRange();
            range.setStart(root, 0);
            range.collapse(true);
            new SelectionSnapshot(root, range).restore(this.#surface.core.selection);
        }, {trigger: 'command', command: 'source'});
        return nodes;
    }

    #model() {
        return narrow(htmlModel, this.#surface.config.elements);
    }
}

// One indented pass over the DOM that also reports where given DOM boundaries
// land in its output. A level gets one element per line only where every child
// is a block, so the whitespace this adds is never significant.
class Writer {
    #model;
    #indent;
    #marks;
    #skip;
    text = '';
    offsets;

    constructor(model, indent, marks, skip) {
        this.#model = model;
        this.#indent = indent;
        this.#marks = marks;
        this.#skip = skip;
        this.offsets = marks.map(() => null);
    }

    children(parent, depth) {
        const lines = separated(parent, this.#model, this.#skip);
        const nodes = [...parent.childNodes];
        for (const [index, child] of nodes.entries()) {
            this.#at(parent, index);
            if (this.#skip(child)) continue;
            if (lines && blank(child)) continue;
            if (lines) this.#line(depth);
            this.node(child, depth);
        }
        this.#at(parent, nodes.length);
        if (lines) this.#line(depth - 1);
    }

    node(node, depth) {
        if (node.nodeType === Node.TEXT_NODE) return this.#characters(node);
        if (node.nodeType === Node.COMMENT_NODE) {
            this.text += `<!--${node.data}-->`;
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const name = node.localName;
        this.text += `<${name}${attributes(node)}>`;
        if (VOID.has(name)) return;
        this.children(node, depth + 1);
        this.text += `</${name}>`;
    }

    #characters(node) {
        for (const [index, mark] of this.#marks.entries()) {
            if (this.offsets[index] === null && mark.node === node) {
                this.offsets[index] = this.text.length + escape(node.data.slice(0, mark.offset)).length;
            }
        }
        this.text += escape(node.data);
    }

    #at(parent, index) {
        for (const [position, mark] of this.#marks.entries()) {
            if (this.offsets[position] === null && mark.node === parent && mark.offset === index) {
                this.offsets[position] = this.text.length;
            }
        }
    }

    #line(depth) {
        this.text += '\n' + this.#indent.repeat(Math.max(depth, 0));
    }
}

// A level is broken into lines only where nothing on it can be affected by
// added whitespace: block elements, comments, and whitespace already there.
function separated(parent, model, skip = () => false) {
    const nodes = [...parent.childNodes].filter(node => !skip(node));
    return nodes.some(node => standalone(node, model))
        && nodes.every(node => blank(node) || standalone(node, model));
}

function standalone(node, model) {
    return node.nodeType === Node.COMMENT_NODE
        || node.nodeType === Node.ELEMENT_NODE && model.block(node);
}

function blank(node) {
    return node.nodeType === Node.TEXT_NODE && !node.data.trim();
}

function prune(parent, model) {
    for (const child of parent.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) prune(child, model);
    }
    if (!separated(parent, model)) return;
    for (const child of [...parent.childNodes]) if (blank(child)) child.remove();
}

function attributes(element) {
    let result = '';
    for (const attribute of element.attributes) {
        result += ` ${attribute.name}="${escape(attribute.value).replaceAll('"', '&quot;')}"`;
    }
    return result;
}

function escape(value) {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
