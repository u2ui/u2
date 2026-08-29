import {Point} from '../../point/point.js';
import {EditRange} from '../edit-range.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../../tests/harness.js';

test('edit range: constructs only inside one editable root', () => withFixture(`
    <div id=one contenteditable>one</div><div id=two contenteditable>two</div>
`, root => {
    const one = root.querySelector('#one');
    const two = root.querySelector('#two');
    const range = document.createRange();
    range.setStart(one.firstChild, 0);
    range.setEnd(one.firstChild, 3);
    equal(new EditRange(one, range).text, 'one');
    range.setEnd(two.firstChild, 3);
    throws(() => new EditRange(one, range), RangeError);
    throws(() => new EditRange(root, range), TypeError);
}));

test('edit range: creates an ordered range from points', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const host = root.firstElementChild;
        const text = host.firstChild;
        const start = new Point(text, 1);
        const end = new Point(text, 4);
        const range = EditRange.fromPoints(start, end, host);
        equal(range.text, 'lph');
        throws(() => EditRange.fromPoints(end, start, host), RangeError);
        throws(() => EditRange.fromPoints({}, end, host), TypeError);
    }
));

test('edit range: reads a selection and rejects nested ownership', () => withFixture(`
    <div id=outer contenteditable>outer <span id=inner contenteditable>inner</span></div>
`, root => {
    const outer = root.querySelector('#outer');
    const inner = root.querySelector('#inner');
    const selection = getSelection();
    selection.setBaseAndExtent(outer.firstChild, 0, outer.firstChild, 5);
    truthy(EditRange.fromSelection(selection, outer));
    selection.setBaseAndExtent(inner.firstChild, 0, inner.firstChild, 5);
    equal(EditRange.fromSelection(selection, outer), null);
    truthy(EditRange.fromSelection(selection, inner));
    selection.removeAllRanges();
    equal(EditRange.fromSelection(selection, inner), null);
}));

test('edit range: preserves backward selection direction', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const host = root.firstElementChild;
        const range = EditRange.fromPoints(new Point(host.firstChild, 1), new Point(host.firstChild, 4), host);
        truthy(range.select(getSelection(), true));
        equal(getSelection().anchorOffset, 4);
        equal(getSelection().focusOffset, 1);
        equal(getSelection().toString(), 'lph');
    }
));

test('edit range: splits same-text boundaries without changing selection', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const host = root.firstElementChild;
        const range = EditRange.fromPoints(new Point(host.firstChild, 1), new Point(host.firstChild, 4), host);
        range.splitTextBoundaries();
        equal([...host.childNodes].map(node => node.data), ['a', 'lph', 'a']);
        equal(range.text, 'lph');
        equal(range.start.offset, 0);
        equal(range.end.offset, 3);
        same(range.start.node, host.childNodes[1]);
        same(range.end.node, host.childNodes[1]);
    }
));

test('edit range: splits boundaries in different text nodes', () => withFixture(
    '<div contenteditable>one <b>two</b> three</div>', root => {
        const host = root.firstElementChild;
        const first = host.firstChild;
        const last = host.lastChild;
        const range = EditRange.fromPoints(new Point(first, 2), new Point(last, 3), host);
        range.splitTextBoundaries();
        equal(range.text, 'e two th');
        equal(first.data, 'on');
        equal(first.nextSibling.data, 'e ');
        equal(last.data, ' th');
        equal(last.nextSibling.data, 'ree');
    }
));

test('edit range: text traversal is ordered and skips nested editors', () => withFixture(`
    <div id=outer contenteditable>one <b>two</b><span contenteditable>hidden</span> three</div>
`, root => {
    const host = root.querySelector('#outer');
    const range = document.createRange();
    range.selectNodeContents(host);
    const edit = new EditRange(host, range);
    equal(edit.textNodes().map(node => node.data), ['one ', 'two', ' three']);
}));

test('edit range: collapsed block traversal returns the nearest matched ancestor', () => withFixture(
    '<div contenteditable><blockquote><p>alpha <b>beta</b></p></blockquote></div>', root => {
        const host = root.firstElementChild;
        const text = host.querySelector('b').firstChild;
        const range = EditRange.fromPoints(new Point(text, 2), new Point(text, 2), host);
        const blocks = range.blocks(element => ['P', 'BLOCKQUOTE'].includes(element.tagName));
        equal(blocks.map(element => element.tagName), ['P']);
        equal(range.blocks(element => element.tagName === 'SECTION'), []);
        throws(() => range.blocks(), TypeError);
    }
));

test('edit range: block traversal returns ordered leaf-owned blocks', () => withFixture(`
    <div contenteditable>
        <p id=one>one</p>
        <blockquote><p id=two>two</p><p id=three><br></p></blockquote>
        <p id=four>four</p>
    </div>
`, root => {
    const host = root.firstElementChild;
    const native = document.createRange();
    native.setStart(host.querySelector('#one').firstChild, 1);
    native.setEndAfter(host.querySelector('#three'));
    const range = new EditRange(host, native);
    const blocks = range.blocks(element => ['P', 'BLOCKQUOTE'].includes(element.tagName));
    equal(blocks.map(element => element.id), ['one', 'two', 'three']);
}));

test('edit range: block traversal handles invalid nesting without hiding direct text', () => withFixture(
    '<div contenteditable></div>', root => {
        const host = root.firstElementChild;
        const outer = document.createElement('p');
        const inner = document.createElement('div');
        outer.id = 'outer';
        inner.id = 'inner';
        outer.append('one ', inner, ' three');
        inner.textContent = 'two';
        host.append(outer);
        const native = document.createRange();
        native.selectNodeContents(host);
        const blocks = new EditRange(host, native).blocks(element => ['P', 'DIV'].includes(element.tagName));
        equal(blocks.map(element => element.id), ['outer', 'inner']);
    }
));

test('edit range: fromRange keeps foreign boundaries out instead of throwing', () => withFixture(
    '<div id=host contenteditable><p>one</p><div contenteditable><p id=nested>two</p></div></div><p id=outside>three</p>', root => {
        const host = root.querySelector('#host');
        const inside = document.createRange();
        inside.selectNodeContents(host.firstElementChild);
        equal(EditRange.fromRange(inside, host).text, 'one');
        const outside = document.createRange();
        outside.selectNodeContents(root.querySelector('#outside'));
        equal(EditRange.fromRange(outside, host), null);
        const nested = document.createRange();
        nested.selectNodeContents(root.querySelector('#nested'));
        equal(EditRange.fromRange(nested, host), null, 'A nested editable owns its own ranges');
        throws(() => EditRange.fromRange(inside, root), TypeError);
    }
));

test('edit range: block traversal keeps ancestors before their nested blocks', () => withFixture(
    '<div contenteditable><blockquote id=quote><p id=inner>one</p>two</blockquote></div>', root => {
        const host = root.firstElementChild;
        const native = document.createRange();
        native.selectNodeContents(host);
        const blocks = new EditRange(host, native).blocks(element => ['BLOCKQUOTE', 'P'].includes(element.tagName));
        equal(blocks.map(element => element.id), ['quote', 'inner']);
    }
));

test('edit range: block traversal skips nested editable hosts', () => withFixture(`
    <div id=outer contenteditable><p id=one>one</p><div contenteditable><p id=hidden>hidden</p></div><p id=two>two</p></div>
`, root => {
    const host = root.querySelector('#outer');
    const native = document.createRange();
    native.selectNodeContents(host);
    const blocks = new EditRange(host, native).blocks(element => element.tagName === 'P');
    equal(blocks.map(element => element.id), ['one', 'two']);
}));

test('edit range: roots return maximal fully selected nodes', () => withFixture(
    '<div contenteditable><p><b>one</b> two</p><p>three</p></div>', root => {
        const host = root.firstElementChild;
        const first = host.firstElementChild;
        const native = document.createRange();
        native.selectNodeContents(first);
        const contents = new EditRange(host, native);
        equal(contents.roots().map(node => node.nodeName), ['B', '#text']);
        native.selectNode(first);
        const node = new EditRange(host, native);
        equal(node.roots().map(item => item.nodeName), ['P']);
    }
));

test('edit range: contains distinguishes partial text from full nodes', () => withFixture(
    '<div contenteditable>alpha <b>beta</b></div>', root => {
        const host = root.firstElementChild;
        const text = host.firstChild;
        const bold = host.lastElementChild;
        const range = EditRange.fromPoints(new Point(text, 2), Point.after(bold), host);
        truthy(range.intersects(text));
        equal(range.contains(text), false);
        truthy(range.contains(bold));
        truthy(range.contains(bold.firstChild));
    }
));

test('edit range: setters, collapse, and clones keep explicit state', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const host = root.firstElementChild;
        const text = host.firstChild;
        const range = EditRange.fromPoints(new Point(text, 1), new Point(text, 4), host);
        const clone = range.clone().setStart(new Point(text, 2)).setEnd(new Point(text, 3));
        equal(clone.text, 'p');
        equal(range.text, 'lph');
        range.collapse('end');
        truthy(range.collapsed);
        equal(range.start.offset, 4);
        throws(() => clone.setStart(new Point(text, 4)), RangeError);
        throws(() => clone.collapse('middle'), TypeError);
    }
));
