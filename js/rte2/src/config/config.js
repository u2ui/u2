const INLINE_HOSTS = new Set([
    'A', 'ABBR', 'B', 'BUTTON', 'CODE', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5',
    'H6', 'I', 'KBD', 'LABEL', 'P', 'PRE', 'Q', 'SAMP', 'SMALL', 'SPAN',
    'STRONG', 'SUB', 'SUP', 'TIME', 'U', 'VAR',
]);
const CLEANUP = new Set(['none', 'minimal', 'structural', 'canonical']);
const ENTER = new Set(['break', 'block', 'item', 'row', 'cell']);
const UI = new Set(['none', 'roaming', 'static']);
const TAG = /^[a-z][a-z\d-]*$/;
const FALSE = new Set(['0', 'false', 'none', 'off']);
const DEFAULT_CLEAN_ON = Object.freeze(['input', 'paste', 'drop', 'command']);
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
