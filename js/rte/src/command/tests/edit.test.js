import {Edit} from '../edit.js';
import {Point} from '../../selection/point/point.js';
import {Rte} from '../../core/core.js';
import {createHtmlModel} from '../../model/html/html-model.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('edit: validates its surface and exposes the host context', () => withSurface(
    '<div contenteditable style="--u2-rte-block: div"><p>text</p></div>', ({surface, host}) => {
        throws(() => new Edit(null), TypeError);
        throws(() => new Edit({element: {}}), TypeError);
        const model = createHtmlModel({rules: {p: {children: []}}});
        const fragment = document.createDocumentFragment();
        const value = {href: '/docs', target: '_blank'};
        const edit = new Edit(surface, null, {model, inputType: 'insertText', data: 'x', value, fragment});
        same(edit.surface, surface);
        same(edit.element, host);
        same(edit.document, document);
        same(edit.model, model);
        equal(edit.transaction, null);
        equal(edit.config.block, 'div');
        equal(edit.inputType, 'insertText');
        equal(edit.data, 'x');
        same(edit.value, value);
        same(edit.fragment, fragment);
        truthy(edit.map);
        equal(new Edit(surface).data, null);
        equal(new Edit(surface).value, null);
        equal(new Edit(surface).fragment, null);
        throws(() => new Edit(surface, null, {data: 1}), TypeError);
        equal(new Edit(surface, null, {value: 1}).value, 1);
        throws(() => new Edit(surface, null, {fragment: document.createElement('p')}), TypeError);
        const foreign = document.implementation.createHTMLDocument().createDocumentFragment();
        same(new Edit(surface, null, {fragment: foreign}).fragment, foreign);
    }
));

test('edit: resolves the current selection when no range is given', () => withSurface(
    '<div contenteditable><p>one two</p></div>', ({surface, host}) => {
        const text = host.firstElementChild.firstChild;
        equal(new Edit(surface).range, null);
        getSelection().setBaseAndExtent(text, 0, text, 3);
        equal(new Edit(surface).range.text, 'one');
    }
));

// A field of the editor's own chrome takes the caret while it names what is
// still selected in the surface, so a command run from there must still find it.
test('edit: a selection outside the surface falls back to the saved one', () => withSurface(
    '<div contenteditable><p>one two</p></div><input id=field>', ({surface, host, root}) => {
        const text = host.firstElementChild.firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.capture();
        root.querySelector('#field').focus();
        getSelection().removeAllRanges();
        equal(new Edit(surface).range.text, 'one');
    }
));

test('edit: an explicit range wins and foreign ranges resolve to null', () => withSurface(
    '<div contenteditable><p>one two</p></div><p id=outside>outside</p>', ({surface, host, root}) => {
        const text = host.firstElementChild.firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        const range = document.createRange();
        range.setStart(text, 4);
        range.setEnd(text, 7);
        equal(new Edit(surface, null, {range}).range.text, 'two');
        const foreign = document.createRange();
        foreign.selectNodeContents(root.querySelector('#outside'));
        equal(new Edit(surface, null, {range: foreign}).range, null);
    }
));

test('edit: select restores collapsed, forward, and backward selections', () => withSurface(
    '<div contenteditable><p>one two</p></div>', ({surface, host}) => {
        const text = host.firstElementChild.firstChild;
        const edit = new Edit(surface);
        const start = new Point(text, 0);
        const end = new Point(text, 3);
        truthy(edit.select(start, end));
        equal(getSelection().toString(), 'one');
        equal(getSelection().anchorOffset, 0);
        truthy(edit.select(start, end, true));
        equal(getSelection().anchorOffset, 3);
        truthy(edit.select(end));
        truthy(getSelection().isCollapsed);
        equal(getSelection().anchorOffset, 3);
        throws(() => edit.select(end, start), RangeError);
    }
));

test('edit: every edit owns an isolated point map', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface}) => {
        const one = new Edit(surface);
        const two = new Edit(surface);
        truthy(one.map !== two.map);
    }
));

function withSurface(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        try {
            return run({core, surface: core.add(host), host, root});
        } finally {
            core.dispose();
        }
    });
}
