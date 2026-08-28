import {SelectionSnapshot} from '../snapshot.js';
import {equal, test, truthy, withFixture} from '../../tests/harness.js';

test('selection: captures and restores a forward selection', () => withFixture(
    '<div contenteditable>alpha beta</div>', root => {
        const host = root.firstElementChild;
        const text = host.firstChild;
        const selection = getSelection();
        selection.setBaseAndExtent(text, 0, text, 5);
        const snapshot = SelectionSnapshot.capture(selection, host);
        equal(snapshot.text, 'alpha');
        equal(snapshot.collapsed, false);
        equal(snapshot.backward, false);
        selection.removeAllRanges();
        truthy(snapshot.restore(selection));
        equal(selection.toString(), 'alpha');
        equal(selection.anchorOffset, 0);
        equal(selection.focusOffset, 5);
    }
));

test('selection: preserves backward direction', () => withFixture(
    '<div contenteditable>alpha beta</div>', root => {
        const host = root.firstElementChild;
        const text = host.firstChild;
        const selection = getSelection();
        selection.setBaseAndExtent(text, 5, text, 0);
        const snapshot = SelectionSnapshot.capture(selection, host);
        equal(snapshot.backward, true);
        selection.removeAllRanges();
        snapshot.restore(selection);
        equal(selection.anchorOffset, 5);
        equal(selection.focusOffset, 0);
    }
));

test('selection: captures a collapsed caret', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const host = root.firstElementChild;
        const selection = getSelection();
        selection.setBaseAndExtent(host.firstChild, 2, host.firstChild, 2);
        const snapshot = SelectionSnapshot.capture(selection, host);
        truthy(snapshot.collapsed);
        equal(snapshot.backward, false);
        equal(snapshot.text, '');
    }
));

test('selection: range clones cannot alter the snapshot', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const host = root.firstElementChild;
        const selection = getSelection();
        selection.setBaseAndExtent(host.firstChild, 1, host.firstChild, 4);
        const snapshot = SelectionSnapshot.capture(selection, host);
        const range = snapshot.range();
        range.collapse();
        equal(snapshot.text, 'lph');
        equal(snapshot.collapsed, false);
    }
));

test('selection: equality compares root, boundaries, and direction', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const host = root.firstElementChild;
        const selection = getSelection();
        selection.setBaseAndExtent(host.firstChild, 1, host.firstChild, 4);
        const first = SelectionSnapshot.capture(selection, host);
        const same = SelectionSnapshot.capture(selection, host);
        truthy(first.equals(same));
        selection.setBaseAndExtent(host.firstChild, 4, host.firstChild, 1);
        equal(first.equals(SelectionSnapshot.capture(selection, host)), false);
        equal(first.equals(null), false);
    }
));

test('selection: live boundaries follow text mutations', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const host = root.firstElementChild;
        const text = host.firstChild;
        const selection = getSelection();
        selection.setBaseAndExtent(text, 1, text, 4);
        const snapshot = SelectionSnapshot.capture(selection, host);
        text.insertData(0, 'x');
        equal(snapshot.text, 'lph');
        snapshot.restore(selection);
        equal(selection.toString(), 'lph');
    }
));

test('selection: rejects selections outside or across editable hosts', () => withFixture(`
    <div id=first contenteditable>one</div>
    <div id=second contenteditable>two</div>
`, root => {
    const first = root.querySelector('#first');
    const second = root.querySelector('#second');
    const selection = getSelection();
    selection.setBaseAndExtent(second.firstChild, 0, second.firstChild, 3);
    equal(SelectionSnapshot.capture(selection, first), null);
    truthy(SelectionSnapshot.capture(selection, second));

    const range = document.createRange();
    range.setStart(first.firstChild, 0);
    range.setEnd(second.firstChild, 3);
    const across = {
        rangeCount: 1,
        anchorNode: first.firstChild,
        anchorOffset: 0,
        focusNode: second.firstChild,
        focusOffset: 3,
        getRangeAt: () => range,
    };
    equal(SelectionSnapshot.capture(across, first), null);
    equal(SelectionSnapshot.capture(across, second), null);
}));

test('selection: nested editable hosts are separate boundaries', () => withFixture(`
    <div id=outer contenteditable>outer <span id=inner contenteditable>inner</span></div>
`, root => {
    const outer = root.querySelector('#outer');
    const inner = root.querySelector('#inner');
    const selection = getSelection();
    selection.setBaseAndExtent(inner.firstChild, 0, inner.firstChild, 5);
    equal(SelectionSnapshot.capture(selection, outer), null);
    truthy(SelectionSnapshot.capture(selection, inner));
}));
