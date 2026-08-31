import {Source, source, sourceView} from '../source.js';
import {editor} from '../rte.js';
import {rte} from '../rte.js';
import {test, truthy, withFixture} from './harness.js';

test('source entry: one optional import extends the default convention client', () => withFixture(
    '<div contenteditable><p>text</p></div>', root => {
        truthy(source);
        truthy(sourceView);
        truthy(Source);
        const surface = rte.add(root.firstElementChild);
        truthy(editor.commands(surface).has('source'));
        rte.delete(surface);
    }
));
