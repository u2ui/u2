import {Rte} from '../../core/core.js';
import {SelectionHighlight} from '../highlight.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

const NAME = 'u2-rte-selection';

test('highlight: validates its core', () => {
    throws(() => new SelectionHighlight(null), TypeError);
    throws(() => new SelectionHighlight({root: document}), TypeError);
});

// A form of the editor's own holds the caret while it changes the text: without
// this the text it is about to change stops looking selected.
test('highlight: draws the saved selection while the focus is elsewhere', () => withFixture(
    '<div contenteditable><p>one two</p></div>', root => {
        if (!CSS.highlights) return;
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        core.sync();
        const highlight = new SelectionHighlight(core);
        try {
            const painted = () => [...CSS.highlights.get(NAME) || []];
            equal(painted().length, 1);
            equal(painted()[0].toString(), 'one');
            truthy(document.querySelector('style[data-u2-rte-highlight]'), 'Its rule goes where the text is');

            getSelection().collapse(text, 1);
            core.sync();
            equal(CSS.highlights.has(NAME), false, 'A caret has nothing to stand in for');

            getSelection().setBaseAndExtent(text, 4, text, 7);
            core.sync();
            equal(painted()[0].toString(), 'two', 'It follows what the surface saved');

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
    '<div contenteditable><p>one two</p></div>', root => {
        if (!CSS.highlights) return;
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        core.sync();
        const highlight = new SelectionHighlight(core);
        try {
            truthy(CSS.highlights.has(NAME));
            surface.element.focus();
            // Programmatic focus depends on the tab owning the browser focus,
            // so what is asserted is what actually happened.
            if (document.activeElement !== surface.element) return;

            highlight.refresh();
            equal(CSS.highlights.has(NAME), false);
            same(core.active, surface, 'The session is untouched');
        } finally {
            highlight.dispose();
            core.dispose();
        }
    }
));
