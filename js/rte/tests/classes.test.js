import {classMark, classStyles, classes} from '../classes.js';
import {editor} from '../editor.js';
import {rte} from '../rte.js';
import {test, truthy, withFixture} from './harness.js';

test('classes entry: one optional import extends the default convention client', () => withFixture(
    '<div contenteditable style="--u2-rte-classes: lead"><p>text</p></div>', root => {
        truthy(classes);
        truthy(classStyles);
        truthy(classMark);
        const surface = rte.add(root.firstElementChild);
        truthy(editor.commands(surface).has('classStyle'));
        rte.delete(surface);
    }
));
