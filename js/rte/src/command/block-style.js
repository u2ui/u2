import {Point} from '../selection/point/point.js';

const TAG = /^[a-z][a-z\d-]*$/;

// A closed group of mutually exclusive text-block representations. The group
// defines which existing elements are styleable, so layout containers are not
// mistaken for paragraphs merely because the content model calls both blocks.
export class BlockStyles {
    #styles;
    #byName;

    constructor(styles) {
        if (!Array.isArray(styles) || !styles.length) throw new TypeError('Block styles require a non-empty array');
        this.#styles = Object.freeze(styles.map(style));
        this.#byName = new Map(this.#styles.map(style => [style.name, style]));
        if (this.#byName.size !== this.#styles.length) throw new RangeError('Block style names must be unique');
    }

    get styles() { return [...this.#styles]; }

    command() {
        return {
            enabled: edit => this.#enabled(edit),
            state: edit => this.#state(edit),
            run: edit => this.#apply(edit, this.#byName.get(edit.value)),
        };
    }

    #enabled(edit) {
        const blocks = this.#blocks(edit);
        const target = edit.value === null ? null : this.#byName.get(edit.value);
        if (edit.value !== null && !target) return false;
        return blocks.some(block => target
            ? this.#render(edit, block, target)
            : this.#styles.some(style => this.#render(edit, block, style))
        );
    }

    #blocks(edit) {
        if (!edit?.range) return [];
        return edit.range.blocks(element => element !== edit.element && this.#current(element));
    }

    // The most specific match, not the last one declared: `p.lead` says more about an element than
    // `p` does, so a plain tag needs no `:not()` to stay out of the way of its own variants.
    #current(element) {
        let current = null;
        for (const style of this.#styles) {
            if (matches(style, element) && (!current || conditions(style) >= conditions(current))) current = style;
        }
        return current;
    }

    #state(edit) {
        const blocks = this.#blocks(edit);
        if (!blocks.length) return null;
        let value = null;
        for (const block of blocks) {
            const name = this.#current(block).name;
            if (value !== null && value !== name) return 'mixed';
            value = name;
        }
        return value;
    }

    #apply(edit, target) {
        if (!target) return [];
        const blocks = this.#blocks(edit);
        if (!blocks.length) return [];
        const start = new Point(edit.range.start.node, edit.range.start.offset, 'forward');
        const end = new Point(edit.range.end.node, edit.range.end.offset, 'backward');
        const backward = !!edit.surface.selection?.backward;
        edit.map.add(start).add(end);
        const changed = [];
        for (const block of blocks) {
            const replacement = this.#render(edit, block, target);
            if (!replacement || block.cloneNode(false).isEqualNode(replacement)) continue;
            const parent = block.parentNode;
            edit.map.replaceWrapper(block, replacement);
            edit.transaction.touch(replacement).touch(parent);
            changed.push(replacement);
        }
        edit.select(edit.map.get(start), edit.map.get(end), backward);
        return changed;
    }

    #render(edit, block, target) {
        const replacement = edit.document.createElement(target.tag);
        for (const attribute of block.attributes) replacement.setAttribute(attribute.name, attribute.value);
        for (const style of this.#styles) style.clear?.(replacement);
        target.write?.(replacement);
        if (!edit.model.allows(block.parentNode, replacement)) return null;
        if ([...block.childNodes].some(child => !edit.model.allows(replacement, child))) return null;
        return replacement;
    }
}

function style(value) {
    if (!value || typeof value !== 'object') throw new TypeError('A block style must be an object');
    for (const property of ['name', 'label', 'selector', 'tag']) {
        if (typeof value[property] !== 'string' || !value[property].trim()) {
            throw new TypeError(`A block style requires ${property}`);
        }
    }
    if (value.write !== undefined && typeof value.write !== 'function') {
        throw new TypeError('Block style write must be a function');
    }
    if (value.clear !== undefined && typeof value.clear !== 'function') {
        throw new TypeError('Block style clear must be a function');
    }
    if (!TAG.test(value.tag.toLowerCase())) throw new TypeError('A block style tag must be a usable tag name');
    return Object.freeze({
        name: value.name.trim(),
        label: value.label,
        selector: value.selector,
        tag: value.tag.toLowerCase(),
        write: value.write || null,
        clear: value.clear || null,
    });
}

function matches(style, element) {
    return element.matches(style.selector);
}

// How much a selector asks for beyond its tag: every class, attribute, id, or pseudo-class counts
// once. Enough to order `p` against `p.lead` and `p.lead[data-x]` without parsing css specificity.
function conditions(style) {
    return (style.selector.match(/[.#[:]/g) ?? []).length;
}
