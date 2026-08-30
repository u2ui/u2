import {ContentModel} from '../content-model.js';

const PHRASING = words(`
    abbr b bdi bdo cite code data dfn em i kbd mark q ruby s samp small span
    strong sub sup time u var
`);
const FLOW_BLOCKS = words(`
    address article aside blockquote details dialog div fieldset figure footer
    form header hgroup main nav search section
`);
const RULES = {};

for (const name of PHRASING) RULES[name] = content(['flow', 'phrasing'], ['@phrasing']);
for (const name of FLOW_BLOCKS) RULES[name] = content(['flow'], ['@flow'], {block: true});

for (const name of words('h1 h2 h3 h4 h5 h6 p pre')) {
    RULES[name] = content(['flow'], ['@phrasing'], {textBlock: true});
}

Object.assign(RULES, {
    a: content(['flow', 'phrasing', 'interactive'], [], {transparent: true, exclude: ['a', '@interactive']}),
    del: content(['flow', 'phrasing'], [], {transparent: true}),
    ins: content(['flow', 'phrasing'], [], {transparent: true}),
    map: content(['flow', 'phrasing'], [], {transparent: true}),
    button: content(['flow', 'phrasing', 'interactive'], ['@phrasing'], {atomic: true, exclude: ['@interactive']}),
    label: content(['flow', 'phrasing', 'interactive'], ['@phrasing'], {exclude: ['label']}),
    textarea: content(['flow', 'phrasing', 'interactive'], [], {atomic: true}),
    select: content(['flow', 'phrasing', 'interactive'], ['option', 'optgroup', 'hr'], {atomic: true}),
    option: content([], ['#text']),
    optgroup: content([], ['option']),
    body: content([], ['@flow'], {block: true}),
    form: content(['flow'], ['@flow'], {block: true, exclude: ['form']}),
    details: content(['flow'], ['summary', '@flow'], {block: true}),
    fieldset: content(['flow'], ['legend', '@flow'], {block: true}),
    figure: content(['flow'], ['figcaption', '@flow'], {block: true}),
    summary: content([], ['@phrasing'], {block: true}),
    legend: content([], ['@phrasing'], {block: true}),
    figcaption: content([], ['@phrasing'], {block: true}),
    ul: content(['flow'], ['li'], {block: true, defaultChild: 'li'}),
    ol: content(['flow'], ['li'], {block: true, defaultChild: 'li'}),
    menu: content(['flow'], ['li'], {block: true, defaultChild: 'li'}),
    li: content([], ['@flow'], {block: true, mergeable: true}),
    dl: content(['flow'], ['dt', 'dd', 'div'], {block: true}),
    dt: content([], ['@flow'], {block: true}),
    dd: content([], ['@flow'], {block: true}),
    table: content(['flow'], ['caption', 'colgroup', 'thead', 'tbody', 'tfoot', 'tr'], {block: true, defaultChild: 'tbody'}),
    caption: content([], ['@flow'], {block: true}),
    colgroup: content([], ['col']),
    thead: content([], ['tr'], {block: true, defaultChild: 'tr'}),
    tbody: content([], ['tr'], {block: true, defaultChild: 'tr'}),
    tfoot: content([], ['tr'], {block: true, defaultChild: 'tr'}),
    tr: content([], ['th', 'td'], {block: true, defaultChild: 'td'}),
    th: content([], ['@flow'], {block: true}),
    td: content([], ['@flow'], {block: true}),
    picture: content(['flow', 'phrasing'], ['source', 'img']),
    audio: content(['flow', 'phrasing', 'interactive'], ['source', 'track', '@flow'], {atomic: true}),
    video: content(['flow', 'phrasing', 'interactive'], ['source', 'track', '@flow'], {atomic: true}),
    object: content(['flow', 'phrasing', 'interactive'], ['@flow'], {atomic: true}),
    iframe: content(['flow', 'phrasing', 'interactive'], [], {atomic: true}),
    canvas: content(['flow', 'phrasing'], ['@phrasing'], {atomic: true}),
    br: content(['flow', 'phrasing'], [], {atomic: true, void: true}),
    wbr: content(['flow', 'phrasing'], [], {atomic: true, void: true}),
    img: content(['flow', 'phrasing'], [], {atomic: true, void: true}),
    input: content(['flow', 'phrasing', 'interactive'], [], {atomic: true, void: true}),
    hr: content(['flow'], [], {block: true, atomic: true, void: true}),
    source: content([], [], {atomic: true, void: true}),
    track: content([], [], {atomic: true, void: true}),
    col: content([], [], {atomic: true, void: true}),
    script: content([], [], {atomic: true}),
    style: content([], [], {atomic: true}),
    template: content([], [], {atomic: true}),
});

export const htmlModel = new ContentModel({
    rules: RULES,
    fallback: {groups: ['flow', 'phrasing'], transparent: true},
    text: {groups: ['flow', 'phrasing']},
});

export function createHtmlModel(overrides) {
    return overrides ? htmlModel.extend(overrides) : htmlModel;
}

function content(groups, children, options = {}) {
    return {groups, children, ...options};
}

function words(value) {
    return value.trim().split(/\s+/);
}
