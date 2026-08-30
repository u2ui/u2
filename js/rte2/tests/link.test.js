import {link, linkEditor, linkHtml, valueMark} from '../link.js';
import {editor} from '../editor.js';
import {rte} from '../rte.js';
import {test, truthy, withFixture} from './harness.js';

test('link entry: one optional import extends the default convention client', () => withFixture(
    '<div contenteditable><p>text</p></div>', root => {
        truthy(link);
        truthy(linkEditor);
        truthy(linkHtml);
        truthy(valueMark);
        const surface = rte.add(root.firstElementChild);
        const commands = editor.commands(surface);
        truthy(commands.has('link'));
        truthy(commands.has('editLink'));
        truthy(commands.has('unlink'));
        rte.delete(surface);
    }
));
