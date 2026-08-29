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
    #inputType;
    #data;
    #range;
    #map = new PointMap();

    constructor(surface, transaction = null, {model = htmlModel, range = null, inputType = '', data = null} = {}) {
        if (surface?.element?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('An edit requires an editor surface');
        if (data !== null && typeof data !== 'string') throw new TypeError('Edit input data must be a string or null');
        this.#surface = surface;
        this.#transaction = transaction;
        this.#model = model;
        this.#inputType = inputType;
        this.#data = data;
        this.#range = range
            ? EditRange.fromRange(range, surface.element)
            : EditRange.fromSelection(surface.core.selection, surface.element);
    }

    get surface() { return this.#surface; }
    get element() { return this.#surface.element; }
    get config() { return this.#surface.config; }
    get transaction() { return this.#transaction; }
    get model() { return this.#model; }
    get map() { return this.#map; }
    get inputType() { return this.#inputType; }
    get data() { return this.#data; }
    get range() { return this.#range; }
    get document() { return this.#surface.element.ownerDocument; }

    select(start, end = start, backward = false) {
        const range = EditRange.fromPoints(start, end, this.element);
        return range.select(this.#surface.core.selection, backward) ? range : null;
    }
}
