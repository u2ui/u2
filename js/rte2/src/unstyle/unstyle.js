const NAME = /^[a-z][a-z\d-]*$/;
const ATTRIBUTE = /^[a-z][a-z\d_.:-]*$/;

export const defaultUnstyleLevels = Object.freeze([
    level('classes', {attributes: ['class']}),
    level('styles', {attributes: ['style']}),
    level('attributes', {attributes: [
        'align', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'color',
        'face', 'height', 'size', 'valign', 'width',
    ]}),
    level('formatting', {elements: ['b', 'em', 'font', 'i', 's', 'span', 'strike', 'strong', 'u']}),
]);

export class Unstyle {
    constructor(levels = defaultUnstyleLevels) {
        if (!Array.isArray(levels) || !levels.length) throw new TypeError('Unstyle levels must be a non-empty array');
        this.levels = Object.freeze(levels.map(item => level(item?.name, item)));
        if (new Set(this.levels.map(item => item.name)).size !== this.levels.length) {
            throw new RangeError('Unstyle level names must be unique');
        }
        Object.freeze(this);
    }

    clean(root, {through, map = null, transaction = null, preserve = null, keep = null} = {}) {
        if (!root?.querySelectorAll) throw new TypeError('Unstyle cleanup requires a DOM root');
        if (map !== null && typeof map?.unwrap !== 'function') throw new TypeError('Unstyle cleanup requires a point map');
        if (transaction !== null && typeof transaction?.touch !== 'function') {
            throw new TypeError('Unstyle cleanup requires a transaction');
        }
        if (preserve !== null && typeof preserve?.has !== 'function') {
            throw new TypeError('Unstyle cleanup requires a preserved element set');
        }
        const kept = keep === null ? null : new Set(keep);
        const end = this.levels.findIndex(level => level.name === through);
        if (end < 0) throw new RangeError(`Unknown unstyle level: ${through}`);
        const changed = [];
        const elements = descendants(root).filter(element => !preserve?.has(element));
        for (const level of this.levels.slice(0, end + 1)) {
            for (const element of elements.filter(element => matches(level, element, kept)).reverse()) {
                clear(level, element, map, transaction, kept);
                if (!changed.includes(element)) changed.push(element);
            }
        }
        return changed;
    }
}

export const defaultUnstyle = new Unstyle();

// `kept` names classes the host treats as content, so removing presentation does
// not remove meaning the application declared.
export function matches(level, element, kept = null) {
    return level.elements.includes(element.localName) && !declared(element, kept)
        || level.attributes.some(name => removable(name, element, kept));
}

// An element carrying a declared content class is content itself: the class
// applies to that wrapper, so removing presentation must not unwrap it.
export function declared(element, kept = null) {
    return !!kept?.size && [...element.classList].some(name => kept.has(name));
}

// Whether a level would actually take something off this element.
export function removable(name, element, kept = null) {
    if (!element.hasAttribute(name)) return false;
    if (name !== 'class' || !kept?.size) return true;
    return [...element.classList].some(value => !kept.has(value));
}

// Takes a level's attributes off one element, narrowing `class` to the names
// the host declared as content instead of dropping it whole.
export function strip(level, element, kept = null) {
    for (const name of level.attributes) {
        if (name === 'class' && kept?.size) {
            const rest = [...element.classList].filter(value => kept.has(value));
            if (rest.length) element.setAttribute('class', rest.join(' '));
            else element.removeAttribute('class');
            continue;
        }
        element.removeAttribute(name);
    }
}

function clear(level, element, map, transaction, kept = null) {
    const parent = element.parentNode;
    strip(level, element, kept);
    const unwrap = !!parent && (level.elements.includes(element.localName)
        || element.localName === 'span' && !element.attributes.length);
    if (unwrap) map ? map.unwrap(element) : element.replaceWith(...element.childNodes);
    if (transaction && parent) transaction.touch(unwrap ? parent : element).touch(parent);
}

function descendants(root) {
    const result = root.nodeType === Node.ELEMENT_NODE ? [root] : [];
    return result.concat([...root.querySelectorAll('*')]);
}

function level(name, options = {}) {
    if (typeof name !== 'string' || !name.trim()) throw new TypeError('An unstyle level requires a name');
    const attributes = names(options.attributes || [], ATTRIBUTE, 'attribute');
    const elements = names(options.elements || [], NAME, 'element');
    if (!attributes.length && !elements.length) throw new TypeError('An unstyle level requires attributes or elements');
    return Object.freeze({name: name.trim(), attributes, elements});
}

function names(values, pattern, label) {
    if (!Array.isArray(values)) throw new TypeError(`Unstyle ${label}s must be an array`);
    const result = [];
    for (const value of values) {
        const name = String(value).toLowerCase();
        if (!pattern.test(name)) throw new TypeError(`Invalid unstyle ${label}: ${value}`);
        if (!result.includes(name)) result.push(name);
    }
    return Object.freeze(result);
}
