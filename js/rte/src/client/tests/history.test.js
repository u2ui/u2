import {Editor} from '../editor.js';
import {history} from '../history.js';
import {Rte} from '../../core/core.js';
import {equal, test, truthy, withFixture} from '../../../tests/harness.js';

// The module names undo and redo and their controls; the recording itself is the
// surface's own `History`. What it has to get right is that both meet.
test('history module: its controls drive the surface history', () => withFixture(
    '<div contenteditable><p>one two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            const surface = core.add(root.firstElementChild);
            const commands = client.commands(surface);
            for (const control of history.toolbar) {
                truthy(commands.has(control.command), `Offered without a command: ${control.command}`);
                equal(commands.keys.get(control.shortcut.split(' ')[0]), control.command);
            }
            equal(commands.keys.get('ctrl+shift+z'), 'redo', 'Redo answers to both of its keys');
            const text = surface.element.querySelector('p').firstChild;
            getSelection().setBaseAndExtent(text, 0, text, 3);
            core.sync();
            commands.run('bold');
            equal(surface.element.innerHTML, '<p><strong>one</strong> two</p>');
            commands.run('undo');
            equal(surface.element.innerHTML, '<p>one two</p>');
            commands.run('redo');
            equal(surface.element.innerHTML, '<p><strong>one</strong> two</p>');
        } finally {
            client.dispose();
            core.dispose();
        }
    }
));
