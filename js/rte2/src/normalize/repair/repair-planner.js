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

    constructor(root, {model = htmlModel, block = null, level = 'structural', generic = ['div']} = {}) {
        if (root?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('A repair planner requires an element root');
        if (typeof model?.allows !== 'function' || typeof model?.rule !== 'function' || typeof model?.block !== 'function') {
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

        if (this.#level !== 'minimal' && parent === this.#root) {
            const plan = this.#rootPlan(child);
            if (plan) return plan;
        }
        if (this.#model.allows(parent, child)) return KEEP;
        if (ignorable(child)) return REMOVE;

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
        const wrapper = this.#element(this.#block);
        if (!wrapper || !this.#model.allows(this.#root, wrapper)) return null;
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
        if (child.nodeType === Node.ELEMENT_NODE && this.#generic.has(child.localName) && neutral(child)) {
            const children = [...child.childNodes];
            if (child.localName !== wrapper.localName && children.every(node => this.#model.allows(wrapper, node))) {
                return action('convert', {tag: wrapper.localName});
            }
            const content = children.filter(node => !ignorable(node));
            if (content.length && content.every(node => this.#model.block(node) && this.#model.allows(this.#root, node))) {
                return action('unwrap', {breaks: false});
            }
        }
        if (!this.#model.block(child) && this.#model.allows(wrapper, child)) {
            return action('wrap', {tag: wrapper.localName});
        }
        return null;
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
