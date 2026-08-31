import {unstyle, unstyles} from '../unstyle.js';
import {Editor} from '../editor.js';
import {Rte} from '../../core/core.js';
import {defaultUnstyleLevels} from '../../unstyle/unstyle.js';
import {equal, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('unstyle client module: contributes a staged action control', () => withFixture(
    '<div contenteditable style="--u2-rte-toolbar:unstyle"><p><span class=x>text</span></p></div>', root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        client.add(unstyle);
        const surface = core.add(root.firstElementChild);
        const text = surface.element.querySelector('span').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 4);
        core.sync();
        const button = client.toolbar.element.querySelector('[data-control=unstyle]');
        truthy(button);
        equal(button.hidden, false);
        equal(button.disabled, false);
        button.click();
        equal(surface.element.innerHTML, '<p>text</p>');
        truthy(button.disabled);
        client.dispose();
        core.dispose();
    }
));

test('unstyle client module: identity and labels are configurable', () => {
    const module = unstyles(defaultUnstyleLevels, {
        name: 'clean', control: 'clear', command: 'clearStyle', label: 'Clean', text: 'C',
    });
    equal(module.name, 'clean');
    equal(module.toolbar[0], {
        type: undefined,
        name: 'clear',
        command: 'clearStyle',
        label: 'Clean',
        text: 'C',
        shortcut: 'ctrl+\\',
    });
    throws(() => unstyles(defaultUnstyleLevels, {name: ''}), TypeError);
    throws(() => unstyles(defaultUnstyleLevels, {text: null}), TypeError);
});
