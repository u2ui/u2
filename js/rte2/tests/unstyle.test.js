import {Unstyle, defaultUnstyle, defaultUnstyleLevels, unstyle, unstyleCommand, unstyles} from '../unstyle.js';
import {editor} from '../editor.js';
import {rte} from '../rte.js';
import {test, truthy, withFixture} from './harness.js';

test('unstyle entry: one optional import extends the default convention client', () => withFixture(
    '<div contenteditable><p><span class=x>text</span></p></div>', root => {
        truthy(unstyle);
        truthy(unstyles);
        truthy(Unstyle);
        truthy(defaultUnstyle);
        truthy(defaultUnstyleLevels);
        truthy(unstyleCommand);
        const surface = rte.add(root.firstElementChild);
        truthy(editor.commands(surface).has('unstyle'));
        rte.delete(surface);
    }
));
