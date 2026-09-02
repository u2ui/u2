import {Editor} from '../editor.js';
import {marks} from '../marks.js';
import {Rte} from '../../core/core.js';
import {equal, test, truthy, withFixture} from '../../../tests/harness.js';

// The module decides which marks an editor offers and what they are called; the
// marking itself belongs to the pending-mark path every control goes through.
test('marks module: every control is a command it registers', () => withFixture(
    '<div contenteditable><p>one two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            const surface = core.add(root.firstElementChild);
            const commands = client.commands(surface);
            for (const control of marks.toolbar) {
                truthy(commands.has(control.command), `Offered without a command: ${control.command}`);
                truthy(control.label, 'Every control says what it is');
                equal(control.state, true, 'A mark reports whether it is on');
                equal(commands.keys.get(control.shortcut), control.command, 'And is reachable by its key');
            }
            equal(marks.toolbar.map(control => control.command).join(' '),
                'bold italic underline strike code');
            const text = surface.element.querySelector('p').firstChild;
            getSelection().setBaseAndExtent(text, 0, text, 3);
            core.sync();
            commands.run('bold');
            equal(surface.element.innerHTML, '<p><strong>one</strong> two</p>');
        } finally {
            client.dispose();
            core.dispose();
        }
    }
));
