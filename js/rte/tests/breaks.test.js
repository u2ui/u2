import {breakMarks, breaks} from '../breaks.js';
import {editor} from '../editor.js';
import {rte} from '../rte.js';
import {same, test, truthy, withFixture} from './harness.js';

test('visible breaks entry: one import installs the optional extension', () => withFixture(
    '<div contenteditable style="--u2-rte-show-breaks:true">one<br>two</div>', root => {
        truthy(typeof breakMarks === 'function');
        same(editor.add(breaks), editor);
        const surface = rte.add(root.firstElementChild);
        truthy(editor.commands(surface).has('showBreaks'));
        truthy(surface.element.hasAttribute('data-u2-rte-breaks'));
        rte.delete(surface);
    }
));
