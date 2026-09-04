import {htmlModel} from '../model/html/html-model.js';
import {EditRange} from '../selection/range/edit-range.js';
import {PointMap} from '../selection/map/point-map.js';

// One command execution: the affected range, the point map every mutation goes
// through, and the resulting selection. Commands own their algorithm, not this
// plumbing.
export class Edit {
    #surface;
    #transaction;
    #model;
    #narrowed = null;
    #inputType;
    #data;
    #value;
    #fragment;
    #range;
    #map = new PointMap();

    constructor(surface, transaction = null, {
        model = htmlModel,
        range = null,
        inputType = '',
        data = null,
        value = null,
        fragment = null,
    } = {}) {
        if (surface?.element?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('An edit requires an editor surface');
        if (data !== null && typeof data !== 'string') throw new TypeError('Edit input data must be a string or null');
        if (fragment !== null && fragment?.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
            throw new TypeError('Edit fragment must be a DocumentFragment or null');
        }
        this.#surface = surface;
        this.#transaction = transaction;
        this.#model = model;
        this.#inputType = inputType;
        this.#data = data;
        this.#value = value;
        this.#fragment = fragment;
        // The same rule a transaction applies: a live selection inside the
        // surface is newer than the saved one, and a selection outside it says
        // nothing about what is being edited — a field of the editor's own
        // chrome holds the caret while it names what is still selected here.
        this.#range = range
            ? EditRange.fromRange(range, surface.element)
            : EditRange.fromSelection(surface.core.selection, surface.element)
                || (surface.selection ? EditRange.fromRange(surface.selection.range(), surface.element) : null);
    }

    get surface() { return this.#surface; }
    get element() { return this.#surface.element; }
    get config() { return this.#surface.config; }
    get transaction() { return this.#transaction; }
    // Narrowing the model reads the host configuration, and most availability
    // checks never consult it. Resolving it on first use keeps a toolbar
    // refresh from paying for every control that does not care.
    get model() {
        // The surface has read its host already; asking the platform again is the expensive half of
        // an availability check, and every control makes one.
        this.#narrowed ??= narrow(this.#model, this.config.elements);
        return this.#narrowed;
    }
    get map() { return this.#map; }
    get inputType() { return this.#inputType; }
    get data() { return this.#data; }
    get value() { return this.#value; }

    /** The same edit with single inputs replaced: a command answering for a set of values has to ask
     *  its adapter about another one, and spreading an edit would leave its getters behind. */
    with(options) {
        return new Edit(this.#surface, this.#transaction, {
            model: this.#model, range: this.#range?.range() ?? null, inputType: this.#inputType,
            data: this.#data, value: this.#value, fragment: this.#fragment, ...options,
        });
    }
    get fragment() { return this.#fragment; }
    get range() { return this.#range; }
    get document() { return this.#surface.element.ownerDocument; }

    select(start, end = start, backward = false) {
        const range = EditRange.fromPoints(start, end, this.element);
        return range.select(this.#surface.core.selection, backward) ? range : null;
    }
}

export function narrow(model, elements) {
    return elements === null || typeof model.withElements !== 'function' ? model : model.withElements(elements);
}
