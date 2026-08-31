import {elementAttributes, imageTools, images, selectedElement} from '../images.js';
import {editor} from '../rte.js';
import {rte} from '../rte.js';
import {test, truthy, withFixture} from './harness.js';

test('images entry: one optional import extends the default convention client', () => withFixture(
    '<div contenteditable><p><img src=/a.png></p></div>', root => {
        truthy(images);
        truthy(imageTools);
        truthy(elementAttributes);
        truthy(selectedElement);
        const surface = rte.add(root.firstElementChild);
        const commands = editor.commands(surface);
        truthy(commands.has('imageSize'));
        truthy(commands.has('imageOriginal'));
        rte.delete(surface);
    }
));
