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
        truthy(menu(client));
        equal(entries(client), ['brandColor', 'highlight', 'red']);
        equal(menu(client).hidden, false);
        equal(menu(client).getAttribute('aria-disabled'), 'false');
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
            equal(menu(client).hidden, true);
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
            equal(entries(client), ['brandColor', 'highlight', 'red']);
            getSelection().setBaseAndExtent(text(second), 0, text(second), 3);
            core.sync();
            equal(entries(client), ['lead']);
        } finally {
            client.dispose();
            core.dispose();
        }
    }
));

// The control is one menu: its entries are the host's sets, in the order they are declared.
const menu = client => client.toolbar.element.querySelector('button[data-command-menu]');
const panel = client => client.toolbar.element.querySelector('[data-menu]');
const entries = client => [...panel(client).querySelectorAll('button[data-value]')].map(entry => entry.dataset.value);

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

// A field that combines axes names them as groups; every set becomes a section of the same menu,
// exclusive in itself and free of the others.
test('class control: a declared group is a section of the same menu', () => withFixture(`
    <div contenteditable style="
        --u2-rte-toolbar: style; --u2-rte-classes: Lead Red Green;
        --u2-rte-class-groups: Lead, color(Red Green);
    "><p>text</p></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    try {
        client.add(classStyles());
        const surface = core.add(root.firstElementChild);
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 4);
        core.sync();
        equal(entries(client), ['Lead', 'Red', 'Green'], 'The loose ones on top, then each named set');
        equal([...panel(client).querySelectorAll('b')].map(caption => caption.textContent), ['color']);

        const pick = value => [...panel(client).querySelectorAll('button[data-value]')]
            .findLast(entry => entry.dataset.value === value).click();
        pick('Green');
        equal(surface.element.innerHTML, '<p><span class="Green">text</span></p>');
        pick('Lead');
        equal(surface.element.innerHTML, '<p><span class="Green Lead">text</span></p>',
            'A loose one is its own set, so it joins rather than replaces');
        pick('Red');
        equal(surface.element.innerHTML, '<p><span class="Lead Red">text</span></p>',
            'One set is one either-or, and what the other sets carry stays');
    } finally {
        client.dispose();
        core.dispose();
    }
}));


// A set may carry nothing: picking what is set again takes it off, and leaves the other sets alone.
test('class control: picking an active class removes it', () => withFixture(`
    <div contenteditable style="
        --u2-rte-toolbar: style; --u2-rte-classes: Lead Red Green;
        --u2-rte-class-groups: Lead, color(Red Green);
    "><p>text</p></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    try {
        client.add(classStyles());
        const surface = core.add(root.firstElementChild);
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 4);
        core.sync();
        const commands = client.commands(surface);
        commands.run('classStyle', {value: 'Red'});
        commands.run('classStyle', {value: 'Lead'});
        equal(surface.element.innerHTML, '<p><span class="Red Lead">text</span></p>');
        truthy(commands.enabled('classStyle', {value: 'Red'}), 'What is set stays pickable');
        commands.run('classStyle', {value: 'Red'});
        equal(surface.element.innerHTML, '<p><span class="Lead">text</span></p>', 'Its own set is emptied');
        commands.run('classStyle', {value: 'Lead'});
        equal(surface.element.innerHTML, '<p>text</p>', 'And the wrapper goes with the last one');
    } finally {
        client.dispose();
        core.dispose();
    }
}));
