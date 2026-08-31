import {belongsTo, selectionOf} from './ownership/ownership.js';

export class SelectionSnapshot {
    #root;
    #range;
    #backward;

    constructor(root, range, backward = false) {
        this.#root = root;
        this.#range = range.cloneRange();
        this.#backward = backward && !range.collapsed;
    }

    static capture(selection, root) {
        if (!selection?.rangeCount || !selection.anchorNode || !selection.focusNode) return null;
        if (!belongsTo(selection.anchorNode, root) || !belongsTo(selection.focusNode, root)) return null;
        const range = selection.getRangeAt(0);
        const backward = !range.collapsed
            && selection.anchorNode === range.endContainer
            && selection.anchorOffset === range.endOffset;
        return new this(root, range, backward);
    }

    get root() { return this.#root; }
    get collapsed() { return this.#range.collapsed; }
    get backward() { return this.#backward; }
    get text() { return this.#range.toString(); }

    range() {
        return this.#range.cloneRange();
    }

    equals(snapshot) {
        if (!(snapshot instanceof SelectionSnapshot)) return false;
        const range = snapshot.#range;
        return this.#root === snapshot.#root
            && this.#backward === snapshot.#backward
            && this.#range.startContainer === range.startContainer
            && this.#range.startOffset === range.startOffset
            && this.#range.endContainer === range.endContainer
            && this.#range.endOffset === range.endOffset;
    }

    valid() {
        return belongsTo(this.#range.startContainer, this.#root)
            && belongsTo(this.#range.endContainer, this.#root);
    }

    restore(selection = selectionOf(this.#root)) {
        if (!selection || !this.valid()) return false;
        const range = this.#range;
        if (selection.setBaseAndExtent) {
            const anchorNode = this.#backward ? range.endContainer : range.startContainer;
            const anchorOffset = this.#backward ? range.endOffset : range.startOffset;
            const focusNode = this.#backward ? range.startContainer : range.endContainer;
            const focusOffset = this.#backward ? range.startOffset : range.endOffset;
            selection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
        } else {
            selection.removeAllRanges();
            selection.addRange(range.cloneRange());
        }
        return true;
    }
}
