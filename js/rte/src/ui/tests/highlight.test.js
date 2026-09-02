import {Rte} from '../../core/core.js';
import {SelectionHighlight} from '../highlight.js';
import {equal, test, throws, truthy, withFixture} from '../../../tests/harness.js';

const NAME = 'u2-rte-selection';

// A fixture that stands in for the editor's own form: it takes the caret the way
// a link field does, and is retained, or taking it would end the session it is
// drawn for. Focus is moved for real and announced by hand — a tab that does not
// own the browser focus moves `activeElement` without firing an event.
const FIXTURE = '<div contenteditable><p>one two</p></div><input id=field>';
const enter = element => {
    element.focus();
    element.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
};

test('highlight: validates its core', () => {
    throws(() => new SelectionHighlight(null), TypeError);
    throws(() => new SelectionHighlight({root: document}), TypeError);
});

test('highlight: draws the saved selection while the focus is elsewhere', () => withFixture(
    FIXTURE, root => {
        if (!CSS.highlights) return;
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const field = core.retain(root.querySelector('#field'));
        const text = surface.element.querySelector('p').firstChild;
        // Selecting inside an editable focuses it, so the field has to take the
        // caret back after every one of them.
        const select = (start, end) => {
            getSelection().setBaseAndExtent(text, start, text, end);
            core.sync();
            enter(field);
        };
        select(0, 3);
        const highlight = new SelectionHighlight(core);
        try {
            const painted = () => [...CSS.highlights.get(NAME) || []];
            equal(painted().length, 1);
            equal(painted()[0].toString(), 'one');
            truthy(document.querySelector('style[data-u2-rte-highlight]'), 'Its rule goes where the text is');

            select(4, 7);
            equal(painted()[0].toString(), 'two', 'It follows what the surface saved');

            select(1, 1);
            equal(CSS.highlights.has(NAME), false, 'A caret has nothing to stand in for');

            select(0, 3);
            truthy(CSS.highlights.has(NAME));
            core.activate(null);
            equal(CSS.highlights.has(NAME), false, 'It goes with the session');
        } finally {
            highlight.dispose();
            core.dispose();
        }
        equal(CSS.highlights.has(NAME), false);
        equal(document.querySelector('style[data-u2-rte-highlight]'), null, 'Disposing leaves nothing behind');
    }
));

// The browser already paints the selection it owns; a second one over the same
// range can only disagree with it.
test('highlight: leaves the focused text to the browser', () => withFixture(
    FIXTURE, root => {
        if (!CSS.highlights) return;
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const field = core.retain(root.querySelector('#field'));
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        core.sync();
        enter(surface.element);
        const highlight = new SelectionHighlight(core);
        try {
            equal(CSS.highlights.has(NAME), false, 'Nothing is drawn over the text itself');
            enter(field);
            truthy(CSS.highlights.has(NAME), 'A form of the editor keeps the selection visible');
            enter(surface.element);
            equal(CSS.highlights.has(NAME), false, 'And hands it back');
        } finally {
            highlight.dispose();
            core.dispose();
        }
    }
));
