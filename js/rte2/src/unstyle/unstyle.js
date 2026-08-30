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

    clean(root, {through, map = null, transaction = null, preserve = null} = {}) {
        if (!root?.querySelectorAll) throw new TypeError('Unstyle cleanup requires a DOM root');
        if (map !== null && typeof map?.unwrap !== 'function') throw new TypeError('Unstyle cleanup requires a point map');
        if (transaction !== null && typeof transaction?.touch !== 'function') {
            throw new TypeError('Unstyle cleanup requires a transaction');
        }
        if (preserve !== null && typeof preserve?.has !== 'function') {
            throw new TypeError('Unstyle cleanup requires a preserved element set');
        }
        const end = this.levels.findIndex(level => level.name === through);
        if (end < 0) throw new RangeError(`Unknown unstyle level: ${through}`);
        const changed = [];
        const elements = descendants(root).filter(element => !preserve?.has(element));
        for (const level of this.levels.slice(0, end + 1)) {
            for (const element of elements.filter(element => matches(level, element)).reverse()) {
                clear(level, element, map, transaction);
                if (!changed.includes(element)) changed.push(element);
            }
        }
        return changed;
    }
}

export const defaultUnstyle = new Unstyle();

export function matches(level, element) {
    return level.elements.includes(element.localName)
        || level.attributes.some(name => element.hasAttribute(name));
}

function clear(level, element, map, transaction) {
    const parent = element.parentNode;
    for (const name of level.attributes) element.removeAttribute(name);
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
