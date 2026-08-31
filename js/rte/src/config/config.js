const INLINE_HOSTS = new Set([
    'A', 'ABBR', 'B', 'BUTTON', 'CODE', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5',
    'H6', 'I', 'KBD', 'LABEL', 'P', 'PRE', 'Q', 'SAMP', 'SMALL', 'SPAN',
    'STRONG', 'SUB', 'SUP', 'TIME', 'U', 'VAR',
]);
const CLEANUP = new Set(['none', 'minimal', 'structural', 'canonical']);
const ENTER = new Set(['break', 'block', 'item', 'row', 'cell']);
const UI = new Set(['none', 'roaming', 'static']);
const IMPORT_SANITIZE = new Set(['policy', 'none']);
const TAG = /^[a-z][a-z\d-]*$/;
const CLASS = /^-?[_a-zA-Z][\w-]*$/;
const FALSE = new Set(['0', 'false', 'none', 'off']);
const DEFAULT_CLEAN_ON = Object.freeze(['input', 'paste', 'drop', 'command']);
const EMPTY_ELEMENTS = Object.freeze([]);
export const elementPresets = Object.freeze({
    basic: elements('p ul ol li a strong b em i code br'),
    // What a content field is about: headings, text, lists, tables, media and
    // the text-level semantics that carry meaning. No layout, no embeds, no
    // forms. This is the import default: what may arrive is a narrower question
    // than what a host tolerates in content it owns.
    content: elements(`
        p h1 h2 h3 h4 h5 h6 blockquote pre ul ol li table caption thead tbody
        tfoot tr th td hr img a strong em code span br
    `),
    article: elements('p h1 h2 h3 h4 h5 h6 blockquote pre ul ol li hr a strong b em i u s del ins code kbd mark q small sub sup span br'),
    document: elements('p h1 h2 h3 h4 h5 h6 blockquote pre ul ol li dl dt dd hr figure figcaption img table caption thead tbody tfoot tr th td a strong b em i u s del ins code kbd mark q small sub sup span br'),
});
const DEFAULTS = Object.freeze({
    block: Object.freeze({block: 'p', enter: 'block'}),
    inline: Object.freeze({block: null, enter: 'break'}),
    list: Object.freeze({block: 'li', enter: 'item'}),
    table: Object.freeze({block: 'tbody', enter: 'row'}),
    row: Object.freeze({block: 'tr', enter: 'row'}),
    cell: Object.freeze({block: 'td', enter: 'cell'}),
});

export function enabled(host) {
    const value = getComputedStyle(host).getPropertyValue('--u2-rte').trim().toLowerCase();
    return value !== '' && !FALSE.has(value);
}

export function hostDefaults(host) {
    const tag = host.tagName;
    if (tag === 'UL' || tag === 'OL') return DEFAULTS.list;
    if (tag === 'TABLE') return DEFAULTS.table;
    if (tag === 'THEAD' || tag === 'TBODY' || tag === 'TFOOT') return DEFAULTS.row;
    if (tag === 'TR') return DEFAULTS.cell;
    if (INLINE_HOSTS.has(tag)) return DEFAULTS.inline;
    return DEFAULTS.block;
}

export function config(host) {
    const style = getComputedStyle(host);
    const defaults = hostDefaults(host);
    const cleanOn = value(style, 'clean-on');
    return Object.freeze({
        block: tag(style, 'block', defaults.block),
        enter: choice(style, 'enter', ENTER, defaults.enter),
        cleanup: choice(style, 'cleanup', CLEANUP, 'structural'),
        cleanOn: Object.freeze(cleanOn ? cleanOn.split(/[\s,]+/).filter(Boolean) : [...DEFAULT_CLEAN_ON]),
        elements: allowedElements(style, 'elements', null),
        importElements: allowedElements(style, 'import-elements', elementPresets.content),
        classes: classNames(style),
        // Foreign presentation through the class rung: pasted markup keeps no
        // styles, no presentational attributes, and no undeclared classes.
        importSanitize: choice(style, 'import-sanitize', IMPORT_SANITIZE, 'policy'),
        importUnstyle: value(style, 'import-unstyle') || 'classes',
        ui: choice(style, 'ui', UI, 'roaming'),
    });
}

function value(style, name) {
    const value = style.getPropertyValue(`--u2-rte-${name}`).trim();
    return value === 'auto' ? '' : value;
}

function tag(style, name, fallback) {
    const result = value(style, name).toLowerCase();
    if (result === 'none') return null;
    return TAG.test(result) ? result : fallback;
}

function choice(style, name, choices, fallback) {
    const result = value(style, name);
    return choices.has(result) ? result : fallback;
}

// The class names this host treats as content. One declaration serves the style
// control, the sanitizer, and presentation cleanup, so a class the host knows is
// never offered without being allowed, or cleaned away as foreign.
function classNames(style) {
    const result = value(style, 'classes');
    if (!result) return EMPTY_ELEMENTS;
    const names = result.split(/[\s,]+/).filter(Boolean);
    return names.every(name => CLASS.test(name)) ? Object.freeze([...new Set(names)]) : EMPTY_ELEMENTS;
}

function allowedElements(style, name, fallback) {
    const result = value(style, name).toLowerCase();
    if (!result) return fallback;
    if (result === 'all') return null;
    if (result.startsWith('@')) return elementPresets[result.slice(1)] || EMPTY_ELEMENTS;
    const names = result.split(/[\s,]+/).filter(Boolean);
    return names.length && names.every(name => TAG.test(name)) ? Object.freeze([...new Set(names)]) : EMPTY_ELEMENTS;
}

function elements(value) {
    return Object.freeze(value.trim().split(/\s+/));
}
