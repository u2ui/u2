import {Point} from '../selection/point/point.js';
import {emptyBlock} from './block-boundary.js';

const TAG = /^[a-z][a-z\d-]*$/;

// A closed group of list container elements. The group decides what counts as
// an existing list, so a layout element the content model also calls a block is
// never mistaken for one. Item elements come from the model's default child, so
// the same commands serve any configured list-like structure.
export class Lists {
    #tags;
    #indent;
    #outdent;

    constructor(tags = ['ul', 'ol']) {
        if (!Array.isArray(tags) || !tags.length) throw new TypeError('Lists require a non-empty array of tag names');
        if (tags.some(tag => typeof tag !== 'string' || !TAG.test(tag.trim().toLowerCase()))) {
            throw new TypeError('A list tag must be a usable tag name');
        }
        this.#tags = Object.freeze([...new Set(tags.map(tag => tag.trim().toLowerCase()))]);
        this.#indent = {
            inputTypes: ['formatIndent'],
            enabled: edit => this.#runs(edit).some(run => !!this.#previous(edit, run[0])),
            run: edit => this.#change(edit, run => this.#nest(edit, run)),
        };
        this.#outdent = {
            inputTypes: ['formatOutdent'],
            enabled: edit => this.#runs(edit).some(run => this.#raisable(edit, run)),
            run: edit => this.#change(edit, run => this.#raise(edit, run)),
        };
    }

    get tags() { return [...this.#tags]; }
    get indent() { return this.#indent; }
    get outdent() { return this.#outdent; }

    // Turns the selected blocks into a list of `tag`, converts an existing list
    // of another kind, and lifts its items back out when it is already active.
    toggle(tag) {
        const container = String(tag).trim().toLowerCase();
        if (!this.#tags.includes(container)) throw new RangeError(`Unknown list tag: ${container}`);
        return {
            enabled: edit => this.#enabled(edit, container),
            state: edit => this.#state(edit, container),
            run: edit => {
                // The branch is decided once: changing the first run would
                // otherwise report a different state to the second.
                const lift = this.#state(edit, container) === true;
                return this.#change(edit, run => lift
                    ? this.#lift(edit, run)
                    : this.#apply(edit, run, container));
            },
        };
    }

    #enabled(edit, container) {
        const runs = this.#runs(edit);
        if (!runs.length) return false;
        return this.#state(edit, container) === true
            ? runs.every(run => this.#liftable(edit, run))
            : runs.some(run => this.#appliable(edit, run, container));
    }

    #state(edit, container) {
        const units = this.#units(edit);
        if (!units.length) return null;
        let value = null;
        for (const unit of units) {
            const active = this.#list(edit, unit)?.localName === container;
            if (value !== null && value !== active) return 'mixed';
            value = active;
        }
        return value;
    }

    // One unit per selected block: the list item that owns it, or the block.
    #units(edit) {
        if (!edit?.range) return [];
        const blocks = edit.range.blocks(element => element !== edit.element && edit.model.block(element));
        const units = new Set();
        for (const block of blocks) units.add(this.#unit(edit, block));
        return [...units];
    }

    #unit(edit, block) {
        for (let element = block; element && element !== edit.element; element = element.parentElement) {
            if (this.#list(edit, element)) return element;
        }
        return block;
    }

    // The list an element is an item of, or null.
    #list(edit, element) {
        const list = element?.parentElement;
        if (!list || !this.#tags.includes(list.localName)) return null;
        return edit.model.defaultChild(list) === element.localName ? list : null;
    }

    #previous(edit, item) {
        const list = this.#list(edit, item);
        const previous = item.previousElementSibling;
        return list && previous && this.#list(edit, previous) === list ? previous : null;
    }

    #raisable(edit, run) {
        const list = this.#list(edit, run[0]);
        if (!list) return false;
        return !!this.#list(edit, list.parentElement) || this.#liftable(edit, run);
    }

    #liftable(edit, run) {
        const list = this.#list(edit, run[0]);
        if (!list) return false;
        const parent = list.parentElement;
        return run.every(item => !!ownBlocks(edit, item, parent) || this.#rewritable(edit, parent));
    }

    // An item with nothing that can stand on its own becomes the host's
    // configured text block instead.
    #rewritable(edit, parent) {
        const tag = edit.config.block;
        return !!tag && edit.model.allows(parent, edit.document.createElement(tag));
    }

    #appliable(edit, run, container) {
        const replacement = edit.document.createElement(container);
        const list = this.#list(edit, run[0]);
        if (list) return list.localName !== container && edit.model.allows(list.parentElement, replacement);
        return !!edit.model.defaultChild(container) && edit.model.allows(run[0].parentNode, replacement);
    }

    // Contiguous sibling units share one list, so they are changed together.
    #runs(edit) {
        const runs = [];
        for (const unit of this.#units(edit)) {
            const last = runs.at(-1);
            if (last && last.at(-1).nextElementSibling === unit) last.push(unit);
            else runs.push([unit]);
        }
        return runs;
    }

    #change(edit, change) {
        const runs = this.#runs(edit);
        if (!runs.length) return [];
        const start = new Point(edit.range.start.node, edit.range.start.offset, 'forward');
        const end = new Point(edit.range.end.node, edit.range.end.offset, 'backward');
        const backward = !!edit.surface.selection?.backward;
        edit.map.add(start).add(end);
        const changed = [];
        for (const run of runs) changed.push(...change(run));
        edit.select(edit.map.get(start), edit.map.get(end), backward);
        return changed;
    }

    #apply(edit, run, container) {
        if (!this.#appliable(edit, run, container)) return [];
        const replacement = edit.document.createElement(container);
        const current = this.#list(edit, run[0]);
        if (current) {
            const isolated = this.#isolate(edit, run);
            for (const attribute of isolated.attributes) replacement.setAttribute(attribute.name, attribute.value);
            const parent = isolated.parentElement;
            edit.map.replaceWrapper(isolated, replacement);
            edit.transaction.touch(parent);
            return [this.#join(edit, replacement)];
        }
        const item = edit.model.defaultChild(container);
        const parent = run[0].parentNode;
        edit.map.insert(parent, indexOf(run[0]), replacement);
        for (const block of run) {
            edit.map.move(this.#itemize(edit, block, item), replacement, replacement.childNodes.length);
        }
        edit.transaction.touch(parent);
        return [this.#join(edit, replacement)];
    }

    // The host's neutral text block becomes the item itself; every other block
    // keeps its own element and moves inside one.
    #itemize(edit, block, tag) {
        if (block.localName === tag) return block;
        const item = edit.document.createElement(tag);
        if (block.localName === edit.config.block
            && [...block.childNodes].every(child => edit.model.allows(item, child))) {
            return edit.map.replaceWrapper(block, item);
        }
        edit.map.insert(block.parentNode, indexOf(block), item);
        edit.map.move(block, item, 0);
        return item;
    }

    #lift(edit, run) {
        if (!this.#liftable(edit, run)) return [];
        const isolated = this.#isolate(edit, run);
        const parent = isolated.parentElement;
        let at = indexOf(isolated);
        const changed = [];
        for (const item of [...isolated.children]) {
            const nodes = ownBlocks(edit, item, parent)
                || (this.#rewritable(edit, parent)
                    ? [edit.map.replaceWrapper(item, edit.document.createElement(edit.config.block))]
                    : []);
            for (const node of nodes) {
                edit.map.move(node, parent, at++);
                changed.push(node);
            }
        }
        edit.map.remove(isolated);
        edit.transaction.touch(parent);
        return changed;
    }

    #nest(edit, run) {
        const previous = this.#previous(edit, run[0]);
        if (!previous) return [];
        const tag = run[0].parentElement.localName;
        let nested = previous.lastElementChild;
        if (nested?.localName !== tag) {
            nested = edit.document.createElement(tag);
            if (!edit.model.allows(previous, nested)) return [];
            edit.map.insert(previous, previous.childNodes.length, nested);
        }
        for (const item of run) edit.map.move(item, nested, nested.childNodes.length);
        edit.transaction.touch(previous);
        return [...run];
    }

    #raise(edit, run) {
        const list = this.#list(edit, run[0]);
        if (!list) return [];
        const owner = list.parentElement;
        if (!this.#list(edit, owner)) return this.#lift(edit, run);
        const outer = owner.parentElement;
        const isolated = this.#isolate(edit, run);
        // Content after the nested list stays behind in a trailing item.
        const at = edit.map.split(outer, owner, indexOf(isolated) + 1);
        const trailing = outer.childNodes[at];
        let target = at;
        for (const item of [...isolated.children]) edit.map.move(item, outer, target++);
        edit.map.remove(isolated);
        for (const item of [owner, trailing]) {
            if (item?.parentNode && emptyBlock(item, edit.model)) edit.map.remove(item);
        }
        edit.transaction.touch(outer);
        return [...run];
    }

    // Splits the surrounding list so the run becomes a list of its own.
    #isolate(edit, run) {
        const list = run[0].parentElement;
        const parent = list.parentElement;
        const end = indexOf(run.at(-1)) + 1;
        if (end < list.childNodes.length) edit.map.split(parent, list, end);
        const start = indexOf(run[0]);
        return start > 0 ? parent.childNodes[edit.map.split(parent, list, start)] : list;
    }

    // A list that meets a list of its own kind is one list.
    #join(edit, list) {
        let result = list;
        const previous = result.previousElementSibling;
        if (previous?.localName === result.localName) {
            while (result.firstChild) edit.map.move(result.firstChild, previous, previous.childNodes.length);
            edit.map.remove(result);
            result = previous;
        }
        const next = result.nextElementSibling;
        if (next?.localName === result.localName) {
            while (next.firstChild) edit.map.move(next.firstChild, result, result.childNodes.length);
            edit.map.remove(next);
        }
        return result;
    }
}

function indexOf(node) {
    return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
}

// The item's own blocks, when every one of them may live in `parent` directly.
function ownBlocks(edit, item, parent) {
    const children = [...item.childNodes].filter(node => !emptyBlock(node, edit.model));
    const usable = children.length && children.every(node => node.nodeType === Node.ELEMENT_NODE
        && edit.model.block(node) && edit.model.allows(parent, node));
    return usable ? children : null;
}
