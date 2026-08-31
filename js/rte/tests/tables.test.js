import {Tables, tableTools, tables} from '../tables.js';
import {editor} from '../rte.js';
import {rte} from '../rte.js';
import {test, truthy, withFixture} from './harness.js';

test('tables entry: one optional import extends the default convention client', () => withFixture(
    '<div contenteditable><p>text</p></div>', root => {
        truthy(tables);
        truthy(tableTools);
        truthy(Tables);
        const surface = rte.add(root.firstElementChild);
        const commands = editor.commands(surface);
        for (const name of ['insertTable', 'rowBefore', 'columnAfter', 'deleteTable']) truthy(commands.has(name));
        rte.delete(surface);
    }
));
