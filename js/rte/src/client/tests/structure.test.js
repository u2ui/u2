import {Editor} from '../editor.js';
import {structure} from '../structure.js';
import {Rte} from '../../core/core.js';
import {equal, test, truthy, withFixture} from '../../../tests/harness.js';

// The module names the block controls and hands each to its primitive; what a
// list or a separator does with the content model is that primitive's own test.
test('structure module: every control reaches its command', () => withFixture(
    '<div contenteditable><p>one</p><p>two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            const surface = core.add(root.firstElementChild);
            const commands = client.commands(surface);
            for (const control of structure.toolbar) {
                truthy(commands.has(control.command), `Offered without a command: ${control.command}`);
                if (control.shortcut) equal(commands.keys.get(control.shortcut), control.command);
            }
            const first = surface.element.firstElementChild.firstChild;
            getSelection().collapse(first, 1);
            core.sync();
            commands.run('bullets');
            equal(surface.element.innerHTML, '<ul><li>one</li></ul><p>two</p>');

            getSelection().collapse(surface.element.lastElementChild.firstChild, 1);
            core.sync();
            commands.run('rule');
            truthy(surface.element.querySelector('hr'), 'A separator is a command like any other');
        } finally {
            client.dispose();
            core.dispose();
        }
    }
));
