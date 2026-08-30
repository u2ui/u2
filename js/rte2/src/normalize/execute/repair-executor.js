import {indexOf} from '../../selection/point/point.js';
import {PointMap} from '../../selection/map/point-map.js';

const PASSIVE = new Set(['keep', 'boundary', 'reject']);

export class RepairExecutor {
    #root;
    #map;
    #transaction;

    constructor(root, {map = new PointMap(), transaction = null} = {}) {
        if (root?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('A repair executor requires an element root');
        if (!map?.wrap || !map?.get) throw new TypeError('A repair executor requires a point map');
        if (transaction !== null && typeof transaction?.touch !== 'function') {
            throw new TypeError('A repair transaction must support touch()');
        }
        this.#root = root;
        this.#map = map;
        this.#transaction = transaction;
    }

    get root() { return this.#root; }
    get map() { return this.#map; }
    get transaction() { return this.#transaction; }

    apply(plan, parent, child) {
        if (!plan?.type) throw new TypeError('A repair plan requires a type');
        if (child?.parentNode !== parent || parent !== this.#root && !this.#root.contains(parent)) {
            throw new RangeError('Repair execution requires a direct child inside the root');
        }
        if (PASSIVE.has(plan.type)) return false;
        if (plan.type === 'wrap') {
            this.wrap([child], plan.tag);
        } else if (plan.type === 'convert') {
            const replacement = this.#element(plan.tag);
            this.#map.replaceWrapper(child, replacement);
            this.#touch(parent, replacement);
        } else if (plan.type === 'unwrap') {
            this.#unwrap(child, !!plan.breaks);
        } else if (plan.type === 'lift') {
            this.#lift(child, plan.target);
        } else if (plan.type === 'remove') {
            this.#map.remove(child);
            this.#touch(parent);
        } else {
            throw new TypeError(`Unknown repair action: ${plan.type}`);
        }
        return true;
    }

    wrap(nodes, tag) {
        nodes = [...nodes];
        if (!nodes.length) throw new RangeError('A repair wrapper requires content');
        const parent = nodes[0].parentNode;
        const wrapper = this.#element(tag);
        this.#map.wrap(nodes, wrapper);
        this.#touch(parent, wrapper);
        return wrapper;
    }

    #unwrap(wrapper, breaks) {
        const parent = wrapper.parentNode;
        if (breaks) {
            const previous = sibling(wrapper, 'previousSibling');
            const next = sibling(wrapper, 'nextSibling');
            const before = previous && !isBreak(previous) && !isBreak(first(wrapper));
            const after = next && !isBreak(next) && !isBreak(last(wrapper));
            if (before) this.#map.insert(parent, indexOf(wrapper), this.#element('br'));
            if (after) this.#map.insert(parent, indexOf(wrapper) + 1, this.#element('br'));
        }
        this.#map.unwrap(wrapper);
        this.#touch(parent);
    }

    #lift(node, target) {
        if ((target !== this.#root && !this.#root.contains(target)) || !target?.contains(node)) {
            throw new RangeError('Lift target must be an ancestor inside the repair root');
        }
        while (node.parentNode !== target) {
            const parent = node.parentNode;
            const grand = parent.parentNode;
            const offset = indexOf(parent) + 1;
            let after = null;
            if (node.nextSibling) {
                after = parent.cloneNode(false);
                after.removeAttribute?.('id');
                this.#map.insert(grand, offset, after);
                while (node.nextSibling) this.#map.move(node.nextSibling, after, after.childNodes.length);
            }
            this.#map.move(node, grand, offset);
            this.#touch(parent, grand, after);
        }
    }

    #element(tag) {
        if (typeof tag !== 'string' || !tag) throw new TypeError('A repair element requires a tag name');
        return this.#root.ownerDocument.createElement(tag);
    }

    #touch(...nodes) {
        if (!this.#transaction) return;
        for (const node of nodes) if (node && (node === this.#root || this.#root.contains(node))) this.#transaction.touch(node);
    }
}

function first(node) {
    while (node?.firstChild) node = node.firstChild;
    return node;
}

function last(node) {
    while (node?.lastChild) node = node.lastChild;
    return node;
}

function visible(node) {
    return !!node && node.nodeType !== Node.COMMENT_NODE
        && (node.nodeType !== Node.TEXT_NODE || !!node.data.trim());
}

function sibling(node, direction) {
    do node = node[direction]; while (node && !visible(node));
    return node;
}

function isBreak(node) {
    return node?.nodeType === Node.ELEMENT_NODE && node.localName === 'br';
}

