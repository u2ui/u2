import {belongsTo, selectionOf} from '../ownership/ownership.js';
import {Point} from '../point/point.js';

export class EditRange {
    #root;
    #range;

    constructor(root, range) {
        if (!root?.hasAttribute?.('contenteditable')) throw new TypeError('An edit range requires an explicit editable root');
        if (!range?.cloneRange) throw new TypeError('An edit range requires a native Range');
        if (!belongsTo(range.startContainer, root) || !belongsTo(range.endContainer, root)) {
            throw new RangeError('Range boundaries must belong to the editable root');
        }
        this.#root = root;
        this.#range = range.cloneRange();
    }

    static fromSelection(selection, root) {
        if (!selection?.rangeCount) return null;
        try {
            return new this(root, selection.getRangeAt(0));
        } catch (error) {
            if (error instanceof RangeError) return null;
            throw error;
        }
    }

    static fromPoints(start, end, root) {
        if (!(start instanceof Point) || !(end instanceof Point)) throw new TypeError('Edit range boundaries must be points');
        if (start.compare(end) > 0) throw new RangeError('Edit range start must not follow its end');
        const range = root.ownerDocument.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        return new this(root, range);
    }

    get root() { return this.#root; }
    get collapsed() { return this.#range.collapsed; }
    get text() { return this.#range.toString(); }
    get commonAncestor() { return this.#range.commonAncestorContainer; }
    get start() { return Point.fromRange(this.#range, 'start'); }
    get end() { return Point.fromRange(this.#range, 'end'); }

    range() {
        return this.#range.cloneRange();
    }

    clone() {
        return new this.constructor(this.#root, this.#range);
    }

    setStart(point) {
        this.#assertPoint(point);
        if (point.compare(this.end) > 0) throw new RangeError('Range start must not follow its end');
        this.#range.setStart(point.node, point.offset);
        return this;
    }

    setEnd(point) {
        this.#assertPoint(point);
        if (this.start.compare(point) > 0) throw new RangeError('Range end must not precede its start');
        this.#range.setEnd(point.node, point.offset);
        return this;
    }

    collapse(edge = 'start') {
        if (edge !== 'start' && edge !== 'end') throw new TypeError('Collapse edge must be start or end');
        this.#range.collapse(edge === 'start');
        return this;
    }

    select(selection = selectionOf(this.#root), backward = false) {
        if (!selection) return false;
        const range = this.#range;
        if (selection.setBaseAndExtent) {
            selection.setBaseAndExtent(
                backward ? range.endContainer : range.startContainer,
                backward ? range.endOffset : range.startOffset,
                backward ? range.startContainer : range.endContainer,
                backward ? range.startOffset : range.endOffset,
            );
        } else {
            selection.removeAllRanges();
            selection.addRange(range.cloneRange());
        }
        return true;
    }

    splitTextBoundaries() {
        if (this.#range.collapsed) return this;
        let node = this.#range.endContainer;
        let offset = this.#range.endOffset;
        if (node.nodeType === Node.TEXT_NODE && offset > 0 && offset < node.length) {
            node.splitText(offset);
            this.#range.setEnd(node, offset);
        }
        node = this.#range.startContainer;
        offset = this.#range.startOffset;
        if (node.nodeType === Node.TEXT_NODE && offset > 0 && offset < node.length) {
            const selected = node.splitText(offset);
            this.#range.setStart(selected, 0);
        }
        return this;
    }

    intersects(node) {
        if (!belongsTo(node, this.#root)) return false;
        try {
            return this.#range.intersectsNode(node);
        } catch {
            return false;
        }
    }

    contains(node) {
        if (!this.intersects(node)) return false;
        if (node.nodeType === Node.TEXT_NODE) {
            if (node === this.#range.startContainer && this.#range.startOffset !== 0) return false;
            if (node === this.#range.endContainer && this.#range.endOffset !== node.length) return false;
            return true;
        }
        const range = node.ownerDocument.createRange();
        range.selectNode(node);
        return this.#range.compareBoundaryPoints(0, range) <= 0
            && this.#range.compareBoundaryPoints(2, range) >= 0;
    }

    textNodes() {
        if (this.#range.collapsed) return [];
        const document = this.#root.ownerDocument;
        const filter = document.defaultView.NodeFilter;
        const walker = document.createTreeWalker(this.#root, filter.SHOW_ELEMENT | filter.SHOW_TEXT, {
            acceptNode: node => {
                if (node !== this.#root && node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('contenteditable')) {
                    return filter.FILTER_REJECT;
                }
                if (node.nodeType !== Node.TEXT_NODE) return filter.FILTER_SKIP;
                return selectedText(this.#range, node) ? filter.FILTER_ACCEPT : filter.FILTER_REJECT;
            },
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        return nodes;
    }

    blocks(match) {
        if (typeof match !== 'function') throw new TypeError('Block matching requires a predicate');
        if (this.#range.collapsed) {
            const block = closest(this.#range.startContainer, this.#root, match);
            return block ? [block] : [];
        }
        const document = this.#root.ownerDocument;
        const filter = document.defaultView.NodeFilter;
        const start = Point.fromRange(this.#range, 'start');
        const end = Point.fromRange(this.#range, 'end');
        const walker = document.createTreeWalker(this.#root, filter.SHOW_ELEMENT | filter.SHOW_TEXT, {
            acceptNode: node => {
                if (node !== this.#root && node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('contenteditable')) {
                    return filter.FILTER_REJECT;
                }
                if (node.childNodes.length) return filter.FILTER_SKIP;
                if (node.nodeType === Node.TEXT_NODE) {
                    return selectedText(this.#range, node) ? filter.FILTER_ACCEPT : filter.FILTER_REJECT;
                }
                return overlaps(start, end, node) ? filter.FILTER_ACCEPT : filter.FILTER_REJECT;
            },
        });
        const blocks = [];
        const seen = new Set();
        while (walker.nextNode()) {
            const block = closest(walker.currentNode, this.#root, match);
            if (!block || seen.has(block)) continue;
            seen.add(block);
            blocks.push(block);
        }
        return blocks;
    }

    roots() {
        if (this.#range.collapsed) return [];
        const nodes = [];
        const visit = parent => {
            for (const node of parent.childNodes) {
                if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('contenteditable')) continue;
                if (!this.intersects(node)) continue;
                if (this.contains(node)) nodes.push(node);
                else if (node.childNodes.length) visit(node);
            }
        };
        const common = this.#range.commonAncestorContainer;
        visit(common.nodeType === Node.TEXT_NODE ? common.parentNode : common);
        return nodes;
    }

    #assertPoint(point) {
        if (!(point instanceof Point)) throw new TypeError('Range boundaries must be points');
        if (!belongsTo(point.node, this.#root)) throw new RangeError('Point must belong to the editable root');
    }
}

function selectedText(range, node) {
    if (!node.length || !range.intersectsNode(node)) return false;
    if (range.startContainer === node && range.endContainer === node) return range.startOffset < range.endOffset;
    if (range.startContainer === node && range.startOffset === node.length) return false;
    if (range.endContainer === node && range.endOffset === 0) return false;
    return true;
}

function closest(node, root, match) {
    let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (element && element !== root) {
        if (match(element)) return element;
        element = element.parentElement;
    }
    return null;
}

function overlaps(start, end, node) {
    const nodeRange = node.ownerDocument.createRange();
    nodeRange.selectNode(node);
    return start.compare(Point.fromRange(nodeRange, 'end')) < 0
        && end.compare(Point.fromRange(nodeRange, 'start')) > 0;
}
