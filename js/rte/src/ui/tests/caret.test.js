import {caretAfter} from '../caret.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

// Where a contextual UI hands the caret back: after what it was about to change,
// so whoever just named an image or made a link can keep writing.
test('caret: it lands after the element, collapsed and captured', () => withFixture(
    '<div contenteditable><p>one <a href="/docs">two</a> three</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        try {
            const link = surface.element.querySelector('a');
            truthy(caretAfter(surface, link));
            const range = getSelection().getRangeAt(0);
            truthy(range.collapsed);
            // The start of the text that follows, not the boundary behind the element: engines pull
            // a caret at that boundary back into what it sits behind.
            same(range.startContainer, link.nextSibling);
            equal(range.startOffset, 0, 'Right behind it, not inside it');
            truthy(surface.selection, 'The surface saved what it was handed');
            equal(surface.selection.collapsed, true);
        } finally {
            core.dispose();
        }
    }
));

// An element that a command removed on its way out leaves nothing to sit behind.
test('caret: a gone element leaves the surface with what it had', () => withFixture(
    '<div contenteditable><p>one two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        try {
            const text = surface.element.querySelector('p').firstChild;
            getSelection().setBaseAndExtent(text, 0, text, 3);
            surface.capture();
            getSelection().removeAllRanges();
            caretAfter(surface, document.createElement('a'));
            equal(getSelection().getRangeAt(0).toString(), 'one', 'What it had is what it gets back');
        } finally {
            core.dispose();
        }
    }
));
