import {follows} from '../contextual.js';
import {Rte} from '../../core/core.js';
import {equal, test, withFixture} from '../../../tests/harness.js';

// A selection is not a session: engines leave one inside an editable nobody focused, and the core
// captures it before deciding that no session follows. Contextual UI belongs to the session.
test('contextual: it draws only while the surface has a session', () => withFixture(
    '<div contenteditable><p>text</p></div>', root => {
        const core = new Rte(document, {auto: false});
        try {
            const surface = core.add(root.firstElementChild);
            let drawn = 0;
            let closed = 0;
            const following = follows(surface, () => drawn++, () => closed++);
            surface.emit('u2-rte-selectionchange');
            equal(drawn, 0, 'A capture without a session draws nothing');
            core.activate(surface);
            equal(drawn, 1, 'The session says it belongs on screen');
            surface.emit('u2-rte-selectionchange');
            equal(drawn, 2);
            core.activate(null);
            equal(closed, 1, 'And it goes with the session');
            surface.emit('u2-rte-selectionchange');
            equal(drawn, 2, 'What is left behind draws nothing more');
            following.dispose();
        } finally {
            core.dispose();
        }
    }
));
