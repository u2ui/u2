import {Point} from '../point/point.js';

export class PointMap {
    #points = new Map();

    constructor(points = []) {
        for (const point of points) this.add(point);
    }

    add(point) {
        assertPoint(point);
        if (!this.#points.has(point)) {
            this.#points.set(point, {
                node: point.node,
                offset: point.offset,
                affinity: point.affinity,
            });
        }
        return this;
    }

    has(point) {
        return this.#points.has(point);
    }

    get(point) {
        const mapped = this.#points.get(point);
        if (!mapped) throw new RangeError('Point is not tracked by this map');
        return new Point(mapped.node, mapped.offset, mapped.affinity);
    }

    insert(parent, offset, node) {
        assertBoundary(parent, offset);
        assertDetached(node, parent);
        const reference = parent.childNodes[offset] || null;
        parent.insertBefore(node, reference);
        for (const point of this.#points.values()) {
            if (point.node !== parent) continue;
            if (point.offset > offset || point.offset === offset && point.affinity === 'forward') point.offset++;
        }
        return node;
    }

    splitText(node, offset) {
        if (node?.nodeType !== Node.TEXT_NODE) throw new TypeError('Only a text node can be split');
        if (!Number.isInteger(offset) || offset < 0 || offset > node.length) throw new RangeError('Invalid text split offset');
        if (!node.parentNode) throw new RangeError('A detached text node cannot be split by the map');
        const parent = node.parentNode;
        const index = indexOf(node);
        const right = node.splitText(offset);
        for (const point of this.#points.values()) {
            if (point.node === node) {
                if (point.offset > offset || point.offset === offset && point.affinity === 'forward') {
                    point.node = right;
                    point.offset -= offset;
                }
            } else if (point.node === parent && point.offset > index) {
                point.offset++;
            }
        }
        return right;
    }

    split(container, node, offset) {
        if (container?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('A split container must be an element');
        if (node !== container && !container.contains(node)) throw new RangeError('A split boundary must belong to its container');
        let parent = node;
        let index = offset;
        if (node.nodeType === Node.TEXT_NODE) {
            if (!Number.isInteger(offset) || offset < 0 || offset > node.length) throw new RangeError('Invalid text split offset');
            if (offset > 0 && offset < node.length) this.splitText(node, offset);
            parent = node.parentNode;
            index = indexOf(node) + (offset > 0 ? 1 : 0);
            if (offset === node.length) this.#follow(node, offset, parent, index);
        } else {
            assertBoundary(node, offset);
        }
        while (parent !== container) {
            const tail = parent.cloneNode(false);
            tail.removeAttribute('id');
            const grand = parent.parentNode;
            const at = indexOf(parent) + 1;
            this.insert(grand, at, tail);
            // Both halves replace one element. Nothing belongs between them, and
            // everything from the boundary onward belongs to the trailing half.
            const trailing = [];
            for (const point of this.#points.values()) {
                if (point.node === grand && point.offset === at) point.offset++;
                else if (point.node === parent && follows(point, index)) trailing.push([point, point.offset - index]);
            }
            while (parent.childNodes[index]) this.move(parent.childNodes[index], tail, tail.childNodes.length);
            for (const [point, offset] of trailing) relocate(point, tail, offset);
            parent = grand;
            index = at;
        }
        return index;
    }

    wrap(nodes, wrapper) {
        nodes = [...nodes];
        if (!nodes.length) throw new RangeError('At least one node is required to wrap');
        const parent = nodes[0].parentNode;
        if (!parent || nodes.some(node => node.parentNode !== parent)) throw new RangeError('Wrapped nodes must share a parent');
        const start = indexOf(nodes[0]);
        if (nodes.some((node, index) => parent.childNodes[start + index] !== node)) {
            throw new RangeError('Wrapped nodes must be contiguous and ordered');
        }
        assertDetached(wrapper, parent);
        if (wrapper.childNodes.length) throw new RangeError('A wrapper must be empty');
        const end = start + nodes.length;
        parent.insertBefore(wrapper, nodes[0]);
        for (const node of nodes) wrapper.append(node);
        for (const point of this.#points.values()) {
            if (point.node !== parent) continue;
            if (point.offset < start) continue;
            if (point.offset > end) {
                point.offset += 1 - nodes.length;
            } else if (point.offset === start) {
                if (point.affinity === 'forward') relocate(point, wrapper, 0);
            } else if (point.offset === end) {
                if (point.affinity === 'backward') relocate(point, wrapper, nodes.length);
                else point.offset = start + 1;
            } else {
                relocate(point, wrapper, point.offset - start);
            }
        }
        return wrapper;
    }

    unwrap(wrapper) {
        if (!wrapper?.parentNode) throw new RangeError('A detached node cannot be unwrapped');
        const parent = wrapper.parentNode;
        const index = indexOf(wrapper);
        const count = wrapper.childNodes.length;
        const fragment = wrapper.ownerDocument.createDocumentFragment();
        while (wrapper.firstChild) fragment.append(wrapper.firstChild);
        wrapper.replaceWith(fragment);
        for (const point of this.#points.values()) {
            if (point.node === wrapper) {
                relocate(point, parent, index + point.offset);
            } else if (point.node === parent && point.offset > index) {
                point.offset += count - 1;
            }
        }
        return wrapper;
    }

    replace(node, replacement) {
        if (!node?.parentNode) throw new RangeError('A detached node cannot be replaced');
        const parent = node.parentNode;
        const index = indexOf(node);
        assertDetached(replacement, parent);
        node.replaceWith(replacement);
        for (const point of this.#points.values()) {
            if (!inside(point, node)) continue;
            relocate(point, parent, index + (point.affinity === 'forward' ? 1 : 0));
        }
        return replacement;
    }

    replaceWrapper(node, replacement) {
        if (node?.nodeType !== Node.ELEMENT_NODE || replacement?.nodeType !== Node.ELEMENT_NODE) {
            throw new TypeError('Wrapper replacement requires two elements');
        }
        if (!node.parentNode) throw new RangeError('A detached element cannot be replaced');
        assertDetached(replacement, node.parentNode);
        if (replacement.childNodes.length) throw new RangeError('A replacement wrapper must be empty');
        while (node.firstChild) replacement.append(node.firstChild);
        node.replaceWith(replacement);
        for (const point of this.#points.values()) {
            if (point.node === node) point.node = replacement;
        }
        return replacement;
    }

    move(node, parent, offset) {
        if (!node?.parentNode) throw new RangeError('A detached node cannot be moved');
        assertBoundary(parent, offset);
        if (node === parent || node.contains(parent)) throw new RangeError('A node cannot move into itself');
        const oldParent = node.parentNode;
        const oldIndex = indexOf(node);
        const reference = parent.childNodes[offset] || null;
        if (reference === node || oldParent === parent && node.nextSibling === reference) return node;
        const followers = new Map();
        for (const point of this.#points.values()) {
            if (point.node !== oldParent) continue;
            if (point.offset === oldIndex && point.affinity === 'forward') followers.set(point, 'before');
            else if (point.offset === oldIndex + 1 && point.affinity === 'backward') followers.set(point, 'after');
        }
        parent.insertBefore(node, reference);
        const newIndex = indexOf(node);
        for (const point of this.#points.values()) {
            if (followers.has(point) || inside(point, node)) continue;
            if (point.node === oldParent && point.offset > oldIndex) point.offset--;
            if (point.node === parent && (point.offset > newIndex || point.offset === newIndex && point.affinity === 'forward')) {
                point.offset++;
            }
        }
        for (const [point, edge] of followers) relocate(point, parent, newIndex + (edge === 'after' ? 1 : 0));
        return node;
    }

    // A boundary expressed against a text node is the same boundary as the one
    // after it in its parent; forward affinity has to see it that way.
    #follow(node, offset, target, index) {
        for (const point of this.#points.values()) {
            if (point.node === node && point.offset === offset && point.affinity === 'forward') relocate(point, target, index);
        }
    }

    mergeText(left, right) {
        if (left?.nodeType !== Node.TEXT_NODE || right?.nodeType !== Node.TEXT_NODE) {
            throw new TypeError('Only text nodes can be merged');
        }
        if (!left.parentNode || left.nextSibling !== right) throw new RangeError('Merged text nodes must be adjacent siblings');
        const parent = left.parentNode;
        const index = indexOf(right);
        const offset = left.length;
        left.appendData(right.data);
        right.remove();
        for (const point of this.#points.values()) {
            if (point.node === right) {
                relocate(point, left, offset + point.offset);
            } else if (point.node === parent && point.offset === index) {
                relocate(point, left, offset);
            } else if (point.node === parent && point.offset > index) {
                point.offset--;
            }
        }
        return left;
    }

    remove(node) {
        if (!node?.parentNode) throw new RangeError('A detached node cannot be removed');
        const parent = node.parentNode;
        const index = indexOf(node);
        node.remove();
        for (const point of this.#points.values()) {
            if (inside(point, node)) relocate(point, parent, index);
            else if (point.node === parent && point.offset > index) point.offset--;
        }
        return node;
    }
}

function assertPoint(point) {
    if (!(point instanceof Point)) throw new TypeError('A point map only tracks points');
}

function assertBoundary(node, offset) {
    if (!node?.childNodes) throw new TypeError('A child boundary requires a DOM node');
    if (!Number.isInteger(offset) || offset < 0 || offset > node.childNodes.length) {
        throw new RangeError('Invalid child boundary offset');
    }
}

function assertDetached(node, parent) {
    if (!node?.nodeType) throw new TypeError('A DOM node is required');
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) throw new TypeError('DocumentFragment insertion is not supported yet');
    if (node.parentNode) throw new RangeError('Inserted nodes must be detached');
    if (node === parent || node.contains(parent)) throw new RangeError('A node cannot contain itself');
}

function follows(point, index) {
    return point.offset > index || point.offset === index && point.affinity === 'forward';
}

function inside(point, node) {
    return point.node === node || node.contains(point.node);
}

function relocate(point, node, offset) {
    point.node = node;
    point.offset = offset;
}

function indexOf(node) {
    return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
}
