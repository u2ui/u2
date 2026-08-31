const DEFAULT = Symbol('default mark value');
const EMPTY = Object.freeze([]);

export function markSet(marks) {
    assertSet(marks);
    let set = EMPTY;
    for (const mark of marks) set = mark.add(set);
    return set;
}

export class MarkType {
    #name;
    #rank;
    #excludes;

    constructor(name, {rank = 50, excludes = [name]} = {}) {
        this.#name = nameOf(name, 'A mark type');
        if (!Number.isFinite(rank)) throw new TypeError('A mark rank must be a finite number');
        this.#rank = rank;
        this.#excludes = names(excludes);
    }

    get name() { return this.#name; }
    get rank() { return this.#rank; }
    get exclusions() { return this.#excludes; }

    create(...values) {
        return new Mark(this, values.length ? values[0] : DEFAULT);
    }

    excludes(type) {
        if (!(type instanceof MarkType)) throw new TypeError('A mark type can only exclude another mark type');
        return this.#excludes.includes('*') || this.#excludes.includes(type.name);
    }

    remove(marks) {
        assertSet(marks);
        const kept = marks.filter(mark => mark.type !== this);
        return kept.length === marks.length ? marks : Object.freeze(kept);
    }
}

export class Mark {
    #type;
    #value;
    #key;

    constructor(type, ...values) {
        if (!(type instanceof MarkType)) throw new TypeError('A mark requires a mark type');
        this.#type = type;
        const value = values.length ? values[0] : DEFAULT;
        this.#value = data(value === DEFAULT ? true : value);
        this.#key = JSON.stringify(this.#value);
        Object.freeze(this);
    }

    get type() { return this.#type; }
    get value() { return this.#value; }

    equals(mark) {
        return mark instanceof Mark && this.#type === mark.type && this.#key === mark.#key;
    }

    conflicts(mark) {
        assertMark(mark);
        return this.#type.excludes(mark.type) || mark.type.excludes(this.#type);
    }

    add(marks) {
        assertSet(marks);
        if (marks.some(mark => this.equals(mark))) return marks;
        if (marks.some(mark => !this.#type.excludes(mark.type) && mark.type.excludes(this.#type))) return marks;
        const added = marks.filter(mark => !this.#type.excludes(mark.type));
        const at = added.findIndex(mark => {
            const order = this.#type.rank - mark.type.rank
                || compare(this.#type.name, mark.type.name)
                || compare(this.#key, mark.#key);
            return order < 0;
        });
        at < 0 ? added.push(this) : added.splice(at, 0, this);
        return Object.freeze(added);
    }

    remove(marks) {
        assertSet(marks);
        const kept = marks.filter(mark => !this.equals(mark));
        return kept.length === marks.length ? marks : Object.freeze(kept);
    }
}

function data(value, parents = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'object' || !plain(value)) throw new TypeError('A mark value must be serializable data');
    if (parents.has(value)) throw new TypeError('A mark value cannot be cyclic');
    parents.add(value);
    if (Object.getOwnPropertySymbols(value).length) throw new TypeError('A mark value cannot have symbol keys');
    const copy = Array.isArray(value)
        ? Array.from(value, item => data(item, parents))
        : Object.fromEntries(Object.keys(value).sort().map(key => [key, data(value[key], parents)]));
    parents.delete(value);
    return Object.freeze(copy);
}

function plain(value) {
    if (Array.isArray(value)) return true;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype?.constructor?.name === 'Object';
}

function compare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function names(value) {
    if (!Array.isArray(value)) throw new TypeError('Mark exclusions must be an array of names');
    return Object.freeze([...new Set(value.map(name => name === '*' ? name : nameOf(name, 'A mark exclusion')))]);
}

function nameOf(value, subject) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${subject} must have a non-empty name`);
    return value.trim();
}

function assertSet(marks) {
    if (!Array.isArray(marks) || marks.some(mark => !(mark instanceof Mark))) {
        throw new TypeError('A mark set must be an array of marks');
    }
}

function assertMark(mark) {
    if (!(mark instanceof Mark)) throw new TypeError('A mark is required');
}
