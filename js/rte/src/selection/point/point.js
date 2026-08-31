export class Point {
    #range;
    #affinity;

    constructor(node, offset, affinity = 'forward') {
        if (!node?.nodeType) throw new TypeError('A point requires a DOM node');
        if (affinity !== 'backward' && affinity !== 'forward') {
            throw new TypeError('Point affinity must be backward or forward');
        }
        const length = boundaryLength(node);
        if (!Number.isInteger(offset) || offset < 0 || offset > length) {
            throw new RangeError(`Point offset must be between 0 and ${length}`);
        }
        const document = node.nodeType === 9 ? node : node.ownerDocument;
        this.#range = document.createRange();
        this.#range.setStart(node, offset);
        this.#range.collapse(true);
        this.#affinity = affinity;
    }

    static start(node, affinity = 'forward') {
        return new this(node, 0, affinity);
    }

    static end(node, affinity = 'backward') {
        return new this(node, boundaryLength(node), affinity);
    }

    static before(node, affinity = 'backward') {
        if (!node.parentNode) throw new RangeError('A detached node has no position before it');
        return new this(node.parentNode, indexOf(node), affinity);
    }

    static after(node, affinity = 'forward') {
        if (!node.parentNode) throw new RangeError('A detached node has no position after it');
        return new this(node.parentNode, indexOf(node) + 1, affinity);
    }

    static fromRange(range, edge, affinity = edge === 'end' ? 'backward' : 'forward') {
        if (edge === 'start') return new this(range.startContainer, range.startOffset, affinity);
        if (edge === 'end') return new this(range.endContainer, range.endOffset, affinity);
        throw new TypeError('Range edge must be start or end');
    }

    get node() { return this.#range.startContainer; }
    get offset() { return this.#range.startOffset; }
    get affinity() { return this.#affinity; }

    clone() {
        return new this.constructor(this.node, this.offset, this.#affinity);
    }

    withAffinity(affinity) {
        return new this.constructor(this.node, this.offset, affinity);
    }

    range() {
        return this.#range.cloneRange();
    }

    compare(other) {
        if (!(other instanceof Point)) throw new TypeError('Points can only be compared with points');
        try {
            return Math.sign(this.#range.compareBoundaryPoints(0, other.#range));
        } catch {
            throw new RangeError('Points belong to different DOM trees');
        }
    }

    within(root) {
        return this.node === root || root.contains(this.node);
    }
}

function boundaryLength(node) {
    return typeof node.length === 'number' ? node.length : node.childNodes.length;
}

// A node's child index in its parent. Child boundaries are expressed with it
// throughout the engine, so it lives beside the point that names them.
export function indexOf(node) {
    return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
}
