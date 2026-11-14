import {highlight} from '../highlight.js';
import {editor} from '../rte.js';
import {rte} from '../rte.js';
import {equal, same, test, truthy, withFixture} from './harness.js';

test('highlight entry: one import adds the mark command and its control', () => withFixture(
    '<div contenteditable><p>one two</p></div>', root => {
        same(editor.add(highlight), editor);
        const surface = rte.add(root.firstElementChild);
        const commands = editor.commands(surface);
        truthy(commands.has('highlight'));
        equal(commands.keys.get('ctrl+shift+h'), 'highlight');
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        rte.sync();
        commands.run('highlight');
        equal(surface.element.innerHTML, '<p><mark>one</mark> two</p>');
        commands.run('highlight');
        equal(surface.element.innerHTML, '<p>one two</p>');
        rte.delete(surface);
    }
));
