const INLINE_HOSTS = new Set([
    'A', 'ABBR', 'B', 'BUTTON', 'CODE', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5',
    'H6', 'I', 'KBD', 'LABEL', 'P', 'PRE', 'Q', 'SAMP', 'SMALL', 'SPAN',
    'STRONG', 'SUB', 'SUP', 'TIME', 'U', 'VAR',
]);
const UNWRAPPED_HOSTS = new Set(['LI', 'CAPTION', 'TH', 'TD']);
const CLEANUP = new Set(['none', 'minimal', 'structural', 'canonical']);
const ENTER = new Set(['break', 'block', 'item', 'row', 'cell']);
const ATTRIBUTE = /^[a-z][a-z\d_.:-]*$/;
const PROTOCOL = /^[a-z][a-z\d+.-]*$/;
const UI = new Set(['none', 'roaming', 'static']);
const IMPORT_SANITIZE = new Set(['policy', 'none']);
const TAG = /^[a-z][a-z\d-]*$/;
const CLASS = /^-?[_a-zA-Z][\w-]*$/;
const LABEL = /^[^\s(),]+$/;
// A block style is one element with conditions on it: `p`, `p.lead`, `p[aria-label=note]`.
const SELECTOR = /^[a-z][a-z\d-]*(?:\.[_a-zA-Z][\w-]*|\[[a-z][\w-]*(?:=[^\]\s]+)?\])*$/;
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
    text: Object.freeze({block: null, enter: 'break'}),
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
    if (UNWRAPPED_HOSTS.has(tag)) return DEFAULTS.text;
    if (tag === 'UL' || tag === 'OL') return DEFAULTS.list;
    if (tag === 'TABLE') return DEFAULTS.table;
    if (tag === 'THEAD' || tag === 'TBODY' || tag === 'TFOOT') return DEFAULTS.row;
    if (tag === 'TR') return DEFAULTS.cell;
    if (INLINE_HOSTS.has(tag)) return DEFAULTS.text;
    return DEFAULTS.block;
}

// Only the setting the model narrowing wants. The whole configuration parses
// eleven properties, and reading a computed style is the expensive part of a
// path every keystroke and every availability check goes through.
export function configuredElements(host) {
    return allowedElements(getComputedStyle(host), 'elements', null);
}

export function config(host) {
    const style = getComputedStyle(host);
    const defaults = hostDefaults(host);
    return Object.freeze({
        block: tag(style, 'block', defaults.block),
        enter: choice(style, 'enter', ENTER, defaults.enter),
        cleanup: choice(style, 'cleanup', CLEANUP, 'structural'),
        cleanOn: list(value(style, 'clean-on'), TAG) ?? DEFAULT_CLEAN_ON,
        elements: allowedElements(style, 'elements', null),
        importElements: allowedElements(style, 'import-elements', elementPresets.content),
        classes: classNames(style),
        classGroups: groups(style, 'class-groups', text => list(text, CLASS), label),
        blocks: groups(style, 'blocks', text => SELECTOR.test(text.trim()) ? text.trim() : null, label),
        attributes: groups(style, 'attributes', text => list(text.toLowerCase(), ATTRIBUTE)),
        protocols: groups(style, 'protocols', text => scheme(text.toLowerCase())),
        // Foreign presentation through the class rung: pasted markup keeps no
        // styles, no presentational attributes, and no undeclared classes.
        importSanitize: choice(style, 'import-sanitize', IMPORT_SANITIZE, 'policy'),
        importUnstyle: value(style, 'import-unstyle') || 'classes',
        ui: choice(style, 'ui', UI, 'roaming'),
        inlineUi: inlineNames(style),
    });
}

// Which contextual UIs a field draws at its content — `table image link`. Unset
// means every one the loaded modules bring, `none` means the field stays plain
// while keeping the commands. The same modules then serve a body of text and a
// bare teaser field without a second editor.
export function inlineUi(config, name) {
    return !config.inlineUi || config.inlineUi.includes(name);
}

function inlineNames(style) {
    const result = value(style, 'inline-ui').toLowerCase();
    if (result === 'none') return EMPTY_ELEMENTS;
    return list(result, TAG);
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
    return list(value(style, 'classes'), CLASS) ?? EMPTY_ELEMENTS;
}

// Element-specific lists share one grammar: a bare list is what every element may carry, `name(…)`
// what one of them adds — `class title, a(href target)`, or one level deeper `a(href: http https)`.
// Unset means the policy's own default, so a declaration only says what it changes, and a typo
// yields nothing rather than silently narrowing.
function groups(style, name, read, key = element) {
    const declared = value(style, name); // not lowercased: element names are, class names are not
    if (!declared) return null;
    const result = {};
    for (const group of declared.split(',')) {
        const match = group.trim().match(/^([^\s(),]+)\s*\((.*)\)$/s);
        const parsed = read(match ? match[2] : group);
        const name = match ? key(match[1]) : '*';
        if (!parsed || !name) return null;
        result[name] = parsed;
    }
    return Object.freeze(result);
}

// An element is a tag name, normalized; a group is a label and stays as it was written.
const element = name => TAG.test(name.toLowerCase()) ? name.toLowerCase() : null;
const label = name => LABEL.test(name) ? name : null;

function list(text, pattern) {
    const names = text.split(/[\s,]+/).filter(Boolean);
    return names.length && names.every(one => pattern.test(one)) ? Object.freeze([...new Set(names)]) : null;
}

function scheme(text) {
    const [attribute, ...rest] = text.split(':');
    const schemes = list(rest.join(':'), PROTOCOL);
    return schemes && ATTRIBUTE.test(attribute.trim()) ? Object.freeze({[attribute.trim()]: schemes}) : null;
}

function allowedElements(style, name, fallback) {
    const result = value(style, name).toLowerCase();
    if (!result) return fallback;
    if (result === 'all') return null;
    // An unreadable declaration is ignored, the way css ignores an invalid value: what applies is
    // what applied before it, not an empty field.
    if (result.startsWith('@')) return elementPresets[result.slice(1)] ?? fallback;
    return list(result, TAG) ?? fallback;
}

function elements(value) {
    return Object.freeze(value.trim().split(/\s+/));
}
