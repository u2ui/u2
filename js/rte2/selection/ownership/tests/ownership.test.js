import {belongsTo, editingHost, isEditableHost, isEditingBoundary, selectionOf} from '../ownership.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

test('ownership: inherited editable content belongs to its explicit host', () => withFixture(
    '<div contenteditable><p><span>text</span></p></div>', root => {
        const host = root.firstElementChild;
        const text = host.querySelector('span').firstChild;
        same(editingHost(text), host);
        truthy(belongsTo(text, host));
    }
));

test('ownership: a nested editable is isolated from its parent', () => withFixture(
    '<div id=outer contenteditable>outer <span id=inner contenteditable>inner</span></div>', root => {
        const outer = root.querySelector('#outer');
        const inner = root.querySelector('#inner');
        const text = inner.firstChild;
        same(editingHost(text), inner);
        equal(belongsTo(text, outer), false);
        truthy(belongsTo(text, inner));
    }
));

test('ownership: contenteditable=false is also an explicit boundary', () => withFixture(
    '<div id=outer contenteditable>outer <span id=inner contenteditable=false>inner</span></div>', root => {
        const outer = root.querySelector('#outer');
        const inner = root.querySelector('#inner');
        same(editingHost(inner.firstChild), inner);
        equal(belongsTo(inner.firstChild, outer), false);
    }
));

test('ownership: only standard contenteditable values create boundaries', () => withFixture(
    '<div id=outer contenteditable><span id=invalid contenteditable=inherit>one</span><span id=plain contenteditable=plaintext-only>two</span></div>', root => {
        const outer = root.querySelector('#outer');
        const invalid = root.querySelector('#invalid');
        const plain = root.querySelector('#plain');
        same(editingHost(invalid.firstChild), outer);
        truthy(belongsTo(invalid.firstChild, outer));
        equal(isEditableHost(invalid), false);
        equal(isEditingBoundary(invalid), false);
        same(editingHost(plain.firstChild), plain);
        truthy(isEditableHost(plain));
        truthy(isEditingBoundary(plain));
    }
));

test('ownership: resolves the document selection for a document host', () => withFixture(
    '<div contenteditable>text</div>', root => {
        same(selectionOf(root.firstElementChild), getSelection());
    }
));
