import {classStyles} from '../classes.js';
import {Editor} from '../editor.js';
import {Rte} from '../../core/core.js';
import {equal, test, throws, truthy, withFixture} from '../../../tests/harness.js';

const STYLES = '--u2-rte-toolbar: style; --u2-rte-classes: brandColor, highlight, red';

test('class control: validates its identity options', () => {
    throws(() => classStyles({label: ''}), TypeError);
    throws(() => classStyles({name: 1}), TypeError);
    equal(classStyles().name, 'classes');
    equal(classStyles({command: 'x'}).toolbar[0].command, 'x');
});

test('class control: offers exactly the classes the host declares', () => withClasses(
    ({client, surface}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        const select = client.toolbar.element.querySelector('[data-control=style]');
        truthy(select);
        equal([...select.options].slice(1).map(option => option.value),
            ['brandColor', 'highlight', 'red']);
        equal(select.hidden, false);
        equal(select.disabled, false);
    }
));

test('class control: applies, switches, and removes one class', () => withClasses(
    ({client, surface}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        const commands = client.commands(surface);
        equal(commands.state('classStyle'), null);
        commands.run('classStyle', {value: 'highlight'});
        equal(surface.element.innerHTML, '<p><span class="highlight">one</span> two</p>');
        equal(commands.state('classStyle'), 'highlight');
        commands.run('classStyle', {value: 'red'});
        equal(surface.element.innerHTML, '<p><span class="red">one</span> two</p>',
            'The group is mutually exclusive');
        commands.run('classStyle');
        equal(surface.element.innerHTML, '<p>one two</p>', 'Removing takes the wrapper with it');
    }
));

test('class control: an undeclared class is not applicable', () => withClasses(
    ({client, surface}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        equal(client.commands(surface).enabled('classStyle', {value: 'unknown'}), false);
    }
));

test('class control: a host without classes offers no control', () => withFixture(
    '<div contenteditable style="--u2-rte-toolbar: style"><p>one two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            client.add(classStyles());
            const surface = core.add(root.firstElementChild);
            const text = surface.element.querySelector('p').firstChild;
            getSelection().setBaseAndExtent(text, 0, text, 3);
            core.sync();
            equal(client.commands(surface).enabled('classStyle', {value: 'red'}), false);
            equal(client.toolbar.element.querySelector('[data-control=style]').hidden, true);
        } finally {
            client.dispose();
            core.dispose();
        }
    }
));

test('class control: each host fills the control from its own declaration', () => withFixture(
    `<div id=one contenteditable style="${STYLES}"><p>one</p></div>
     <div id=two contenteditable style="--u2-rte-toolbar: style; --u2-rte-classes: lead"><p>two</p></div>`,
    root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            client.add(classStyles());
            const first = core.add(root.querySelector('#one'));
            const second = core.add(root.querySelector('#two'));
            const text = node => node.element.querySelector('p').firstChild;
            getSelection().setBaseAndExtent(text(first), 0, text(first), 3);
            core.sync();
            const select = client.toolbar.element.querySelector('[data-control=style]');
            equal([...select.options].slice(1).map(option => option.value),
                ['brandColor', 'highlight', 'red']);
            getSelection().setBaseAndExtent(text(second), 0, text(second), 3);
            core.sync();
            equal([...select.options].slice(1).map(option => option.value), ['lead']);
        } finally {
            client.dispose();
            core.dispose();
        }
    }
));

function withClasses(run) {
    return withFixture(`<div contenteditable style="${STYLES}"><p>one two</p></div>`, root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            client.add(classStyles());
            return run({client, core, surface: core.add(root.firstElementChild)});
        } finally {
            client.dispose();
            core.dispose();
        }
    });
}
