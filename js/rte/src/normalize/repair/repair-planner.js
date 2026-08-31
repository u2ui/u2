import {htmlModel} from '../../model/html/html-model.js';
import {isEditingBoundary} from '../../selection/ownership/ownership.js';

const LEVELS = new Set(['none', 'minimal', 'structural', 'canonical']);
const KEEP = Object.freeze({type: 'keep'});
const BOUNDARY = Object.freeze({type: 'boundary'});
const REMOVE = Object.freeze({type: 'remove'});
const REJECT = Object.freeze({type: 'reject'});

export class RepairPlanner {
    #root;
    #model;
    #block;
    #level;
    #generic;
    #elements = new Map();
    #rootWrapper;

    constructor(root, {model = htmlModel, block = null, level = 'structural', generic = ['div', 'span']} = {}) {
        if (root?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('A repair planner requires an element root');
        if (typeof model?.allows !== 'function' || typeof model?.allowed !== 'function'
            || typeof model?.rule !== 'function' || typeof model?.block !== 'function') {
            throw new TypeError('A repair planner requires a content model');
        }
        if (block !== null && (typeof block !== 'string' || !block.trim())) {
            throw new TypeError('Default block must be a tag name or null');
        }
        if (!LEVELS.has(level)) throw new TypeError('Unknown normalization level');
        if (!Array.isArray(generic) || generic.some(name => typeof name !== 'string' || !name.trim())) {
            throw new TypeError('Generic blocks must be tag names');
        }
        this.#root = root;
        this.#model = model;
        this.#block = block?.toLowerCase() || null;
        this.#level = level;
        this.#generic = new Set(generic.map(name => name.toLowerCase()));
    }

    get root() { return this.#root; }
    get model() { return this.#model; }
    get block() { return this.#block; }
    get level() { return this.#level; }

    plan(parent, child) {
        if (child?.parentNode !== parent) throw new RangeError('Repair planning requires a direct child');
        if (parent !== this.#root && !this.#root.contains(parent)) throw new RangeError('Repair parent must belong to the planner root');
        if (this.#level === 'none') return KEEP;
        if (isEditingBoundary(child)) return BOUNDARY;

        if (this.#level !== 'minimal') {
            const plan = parent === this.#root
                ? this.#rootPlan(child)
                : this.#genericPlan(parent, child) || this.#loosePlan(parent, child);
            if (plan) return plan;
        }
        if (this.#level !== 'minimal' && this.#hollow(child)) return REMOVE;
        if (this.#level === 'canonical') {
            const plan = this.#canonicalPlan(parent, child);
            if (plan) return plan;
        }
        if (this.#model.allows(parent, child)) return KEEP;
        if (ignorable(child)) return REMOVE;
        if (child.nodeType === Node.ELEMENT_NODE && !this.#model.allowed(child)) {
            return this.#model.atomic(child) ? REMOVE : action('unwrap', {breaks: this.#model.block(child)});
        }

        const wrapper = this.#wrapper(parent);
        if (wrapper && this.#model.allows(parent, wrapper) && this.#model.allows(wrapper, child)) {
            return action('wrap', {tag: wrapper.localName});
        }
        if (child.nodeType === Node.ELEMENT_NODE && neutral(child)) {
            const children = [...child.childNodes];
            if (children.length && children.every(node => this.#model.allows(parent, node))) {
                const content = children.filter(node => !ignorable(node));
                const breaks = this.#model.block(child) && content.some(node => !this.#model.block(node));
                return action('unwrap', {breaks});
            }
            if (!children.length && !this.#model.atomic(child)) return REMOVE;
        }
        for (let target = parent.parentElement; target && this.#root.contains(target); target = target.parentElement) {
            if (this.#model.allows(target, child)) return action('lift', {target});
            if (target === this.#root) break;
        }
        return REJECT;
    }

    #rootPlan(child) {
        // Whether the root accepts its default block does not depend on the
        // child, so it is decided once instead of for every one of them.
        this.#rootWrapper ??= this.#usableRootWrapper();
        const wrapper = this.#rootWrapper;
        if (!wrapper) return null;
        if (ignorable(child)) {
            const previous = child.previousSibling;
            return child.nodeType === Node.TEXT_NODE
                && previous
                && !ignorable(previous)
                && !this.#model.block(previous)
                && this.#model.allows(wrapper, child)
                    ? action('wrap', {tag: wrapper.localName})
                    : REMOVE;
        }
        if (child.nodeType === Node.ELEMENT_NODE && !this.#model.allowed(child) && this.#model.block(child)) {
            const children = [...child.childNodes];
            if (children.every(node => this.#model.allows(wrapper, node))) {
                return action('convert', {tag: wrapper.localName});
            }
        }
        const plan = this.#genericPlan(this.#root, child);
        if (plan) return plan;
        if (!this.#model.block(child) && this.#model.allows(wrapper, child)) {
            return action('wrap', {tag: wrapper.localName});
        }
        return null;
    }

    // A neutral generic block adds nothing to the document: it becomes the block
    // its context expects, or dissolves into it. Depth is not a reason to keep
    // one — a bare wrapper is as redundant four levels down as it is at the top,
    // and valid nesting is exactly why the model alone never removes it. A
    // generic inline element is not structure and is left to `canonical`.
    #genericPlan(parent, child) {
        if (child.nodeType !== Node.ELEMENT_NODE) return null;
        if (!this.#generic.has(child.localName) || !neutral(child)) return null;
        if (!this.#model.block(child)) return null;
        const children = [...child.childNodes];
        const wrapper = this.#element(this.#model.rule(parent).defaultChild || this.#block);
        if (wrapper && wrapper.localName !== child.localName
            && this.#model.allows(parent, wrapper)
            && children.every(node => this.#model.allows(wrapper, node))) {
            return action('convert', {tag: wrapper.localName});
        }
        const content = children.filter(node => !ignorable(node));
        if (content.some(node => this.#model.block(node))
            && content.every(node => this.#model.allows(parent, node))) {
            return action('unwrap', {breaks: false});
        }
        return null;
    }

    // Loose inline content standing beside blocks in a generic container is the
    // same asymmetry as a bare wrapper: the root already gives it a block, and
    // depth is not a reason to leave it homeless. Containers that carry their
    // own meaning — list items, cells, quotes — keep loose text as it is.
    #loosePlan(parent, child) {
        if (!this.#generic.has(parent.localName) || !this.#model.block(parent)) return null;
        if (ignorable(child) || this.#model.block(child)) return null;
        const wrapper = this.#element(this.#model.rule(parent).defaultChild || this.#block);
        if (!wrapper || !this.#model.allows(parent, wrapper) || !this.#model.allows(wrapper, child)) return null;
        if (![...parent.children].some(node => this.#model.block(node))) return null;
        return action('wrap', {tag: wrapper.localName});
    }

    // Canonical goes one step further than valid: a generic wrapper carrying
    // neither attributes nor meaning of its own is noise even where the model
    // allows it. A semantic element is never noise, however bare it is.
    // An inline element with neither attributes nor content says nothing at all,
    // whatever its name, so it never has to survive being valid.
    #hollow(child) {
        return child.nodeType === Node.ELEMENT_NODE
            && neutral(child)
            && !child.childNodes.length
            && !this.#model.block(child)
            && !this.#model.atomic(child);
    }

    #canonicalPlan(parent, child) {
        if (child.nodeType !== Node.ELEMENT_NODE || !neutral(child)) return null;
        if (this.#model.block(child) || this.#model.atomic(child)) return null;
        if (!this.#generic.has(child.localName)) return null;
        return [...child.childNodes].every(node => this.#model.allows(parent, node))
            ? action('unwrap', {breaks: false})
            : null;
    }

    #usableRootWrapper() {
        const wrapper = this.#element(this.#block);
        return wrapper && this.#model.allows(this.#root, wrapper) ? wrapper : null;
    }

    #wrapper(parent) {
        const name = parent === this.#root && this.#block || this.#model.rule(parent).defaultChild;
        return this.#element(name);
    }

    #element(name) {
        if (!name) return null;
        let element = this.#elements.get(name);
        if (!element) {
            element = this.#root.ownerDocument.createElement(name);
            this.#elements.set(name, element);
        }
        return element;
    }
}

function action(type, detail) {
    return Object.freeze({type, ...detail});
}

function neutral(node) {
    return node.attributes.length === 0;
}

function ignorable(node) {
    return node.nodeType === Node.COMMENT_NODE
        || node.nodeType === Node.TEXT_NODE && !node.data.trim();
}
