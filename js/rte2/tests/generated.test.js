import {EditRange} from '../selection/range/edit-range.js';
import {Normalizer} from '../normalize/normalizer/normalizer.js';
import {Point} from '../selection/point/point.js';
import {PointMap} from '../selection/map/point-map.js';
import {htmlModel} from '../model/html/html-model.js';
import {equal, test, truthy, withFixture} from './harness.js';

const TAGS = [
    'p', 'div', 'span', 'strong', 'em', 'ul', 'li', 'h2', 'br', 'img',
    'blockquote', 'table', 'tr', 'td', 'a', 'section', 'dl', 'dd', 'x-widget',
];
const TEXTS = ['a', 'bc', ' ', 'hello', '\n ', 'x'];
const HOSTS = ['div', 'div', 'section', 'ul', 'td', 'p'];
const RUNS = 60;

test('generated: scoped normalization converges, keeps text, and stays idempotent', () => withFixture('', root => {
    const next = seeded(20260828);
    for (let run = 0; run < RUNS; run++) {
        const level = pick(next, ['minimal', 'structural', 'canonical']);
        const block = pick(next, ['p', 'div', 'li', null]);
        const host = fill(next, editable(pick(next, HOSTS)));
        const scenario = `run ${run} (${host.localName}, block ${block}, ${level})`;
        root.replaceChildren(host);
        const text = visible(host);
        const points = ends(host);
        const result = new Normalizer(host, {block, level}).normalize({points});
        truthy(result.stable, `${scenario}: no fixed point`);
        equal(visible(host), text, `${scenario}: visible text changed`);
        for (const point of points) truthy(result.map.get(point).within(host), `${scenario}: a point left the host`);
        equal(new Normalizer(host, {block, level}).normalize().changed, false, `${scenario}: not idempotent`);
        if (level === 'minimal') continue;
        for (const [parent, child] of pairs(host)) {
            if (result.issues.some(issue => issue.node === child)) continue;
            truthy(htmlModel.allows(parent, child), `${scenario}: <${parent.localName}> still rejects ${child.nodeName}`);
        }
    }
}));

test('generated: mapped points keep their text context through DOM operations', () => withFixture('', root => {
    const next = seeded(51501);
    for (let run = 0; run < RUNS; run++) {
        const host = fill(next, document.createElement('div'));
        root.replaceChildren(host);
        const points = boundaries(host).filter(() => next() < 0.3).map(([node, offset]) =>
            new Point(node, offset, next() < 0.5 ? 'forward' : 'backward'));
        if (!points.length) continue;
        const map = new PointMap(points);
        const expected = points.map(point => context(host, point.node, point.offset));
        const operation = operate(next, map, host);
        if (!operation) continue;
        points.forEach((point, index) => {
            const mapped = map.get(point);
            equal(context(host, mapped.node, mapped.offset), expected[index],
                `run ${run}: ${operation} moved a ${point.affinity} point through the text`);
        });
    }
}));

test('generated: edit range traversal agrees with its native range', () => withFixture('', root => {
    const next = seeded(7707);
    for (let run = 0; run < RUNS; run++) {
        const host = fill(next, editable('div'));
        root.replaceChildren(host);
        const native = span(next, host);
        if (!native || native.collapsed) continue;
        const scenario = `run ${run} (${JSON.stringify(native.toString())})`;
        const range = new EditRange(host, native);
        equal(range.textNodes().map(node => selected(native, node)).join(''), native.toString(),
            `${scenario}: text nodes do not reconstruct the selected text`);
        const blocks = range.blocks(element => htmlModel.block(element));
        equal(blocks.length, new Set(blocks).size, `${scenario}: a block was reported twice`);
        for (let i = 1; i < blocks.length; i++) {
            truthy(blocks[i - 1].compareDocumentPosition(blocks[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
                `${scenario}: blocks are not in document order`);
        }
        const text = range.text;
        range.splitTextBoundaries();
        equal(range.text, text, `${scenario}: splitting boundaries changed the selected text`);
        equal(range.roots().map(node => node.textContent).join(''), text,
            `${scenario}: roots do not cover exactly the selected text`);
    }
}));

// A small deterministic generator keeps every failure replayable by its seed.
function seeded(seed) {
    return () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

function pick(next, list) {
    return list[Math.floor(next() * list.length)];
}

function editable(tag) {
    const host = document.createElement(tag);
    host.contentEditable = 'true';
    return host;
}

function fill(next, host, depth = 2) {
    for (let count = 1 + Math.floor(next() * 3); count > 0; count--) {
        host.append(next() < 0.3 ? document.createTextNode(pick(next, TEXTS)) : element(next, depth));
    }
    return host;
}

function element(next, depth) {
    const node = document.createElement(pick(next, TAGS));
    if (next() < 0.3) node.className = 'meaningful';
    if (depth && !htmlModel.atomic(node)) {
        for (let count = Math.floor(next() * 3); count > 0; count--) {
            node.append(next() < 0.4 ? document.createTextNode(pick(next, TEXTS)) : element(next, depth - 1));
        }
    }
    return node;
}

function visible(node) {
    return node.textContent.replace(/\s+/g, '');
}

function pairs(parent, list = []) {
    for (const child of parent.childNodes) {
        list.push([parent, child]);
        if (child.nodeType === Node.ELEMENT_NODE && !htmlModel.atomic(child)) pairs(child, list);
    }
    return list;
}

function texts(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    while (walker.nextNode()) if (walker.currentNode.length) list.push(walker.currentNode);
    return list;
}

function ends(host) {
    const found = texts(host);
    return found.length ? [new Point(found[0], 0), new Point(found.at(-1), found.at(-1).length, 'backward')] : [];
}

function boundaries(root, list = []) {
    if (root.nodeType === Node.TEXT_NODE) {
        for (let offset = 0; offset <= root.length; offset++) list.push([root, offset]);
        return list;
    }
    for (let offset = 0; offset <= root.childNodes.length; offset++) list.push([root, offset]);
    for (const child of root.childNodes) boundaries(child, list);
    return list;
}

// The text before and after a boundary is invariant for content-preserving operations.
function context(root, node, offset) {
    const before = root.ownerDocument.createRange();
    before.selectNodeContents(root);
    before.setEnd(node, offset);
    const after = root.ownerDocument.createRange();
    after.selectNodeContents(root);
    after.setStart(node, offset);
    return [before.toString(), after.toString()];
}

function operate(next, map, host) {
    const elements = [...host.querySelectorAll('*')];
    const parents = [host, ...elements].filter(node => node.childNodes.length);
    const found = texts(host);
    switch (Math.floor(next() * 7)) {
        case 0: {
            if (!found.length) return null;
            const text = pick(next, found);
            const offset = Math.floor(next() * (text.length + 1));
            map.splitText(text, offset);
            return `splitText(${JSON.stringify(text.data)}, ${offset})`;
        }
        case 1: {
            if (!parents.length) return null;
            const parent = pick(next, parents);
            const children = [...parent.childNodes];
            const start = Math.floor(next() * children.length);
            const end = start + 1 + Math.floor(next() * (children.length - start));
            map.wrap(children.slice(start, end), document.createElement('i'));
            return `wrap(<${parent.localName}> [${start}, ${end}))`;
        }
        case 2: {
            if (!elements.length) return null;
            const wrapper = pick(next, elements);
            map.unwrap(wrapper);
            return `unwrap(<${wrapper.localName}>)`;
        }
        case 3: {
            if (!elements.length) return null;
            const wrapper = pick(next, elements);
            map.replaceWrapper(wrapper, document.createElement('u'));
            return `replaceWrapper(<${wrapper.localName}>)`;
        }
        case 4: {
            const adjacent = found.filter(text => text.nextSibling?.nodeType === Node.TEXT_NODE);
            if (!adjacent.length) return null;
            const left = pick(next, adjacent);
            map.mergeText(left, left.nextSibling);
            return `mergeText(${JSON.stringify(left.data)})`;
        }
        case 5: {
            if (!elements.length) return null;
            const node = pick(next, [...found, ...elements]);
            const container = pick(next, ancestors(node, host));
            if (!container) return null;
            const offset = Math.floor(next() * (boundaryLength(node) + 1));
            map.split(container, node, offset);
            return `split(<${container.localName}>, ${node.nodeName}, ${offset})`;
        }
        default: {
            const parent = pick(next, [host, ...elements]);
            const offset = Math.floor(next() * (parent.childNodes.length + 1));
            map.insert(parent, offset, document.createElement('s'));
            return `insert(<${parent.localName}>, ${offset})`;
        }
    }
}

function ancestors(node, host) {
    const list = [];
    for (let element = node.parentElement; element && element !== host.parentElement; element = element.parentElement) {
        list.push(element);
    }
    return list;
}

function boundaryLength(node) {
    return node.nodeType === Node.TEXT_NODE ? node.length : node.childNodes.length;
}

function span(next, host) {
    const all = boundaries(host);
    const one = pick(next, all);
    const other = pick(next, all);
    const range = document.createRange();
    range.setStart(one[0], one[1]);
    range.collapse(true);
    const [start, end] = range.comparePoint(other[0], other[1]) < 0 ? [other, one] : [one, other];
    range.setStart(start[0], start[1]);
    range.setEnd(end[0], end[1]);
    return range;
}

function selected(range, text) {
    const start = range.startContainer === text ? range.startOffset : 0;
    const end = range.endContainer === text ? range.endOffset : text.length;
    return text.data.slice(start, end);
}
