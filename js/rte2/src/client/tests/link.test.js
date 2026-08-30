import {link, linkEditor} from '../link.js';
import {Editor} from '../editor.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('link editor: validates its fields', () => {
    throws(() => linkEditor({fields: []}), TypeError);
    throws(() => linkEditor({fields: ['onclick']}), TypeError);
    equal(linkEditor().name, 'link');
    truthy(linkEditor() !== link);
});

test('link editor: a selection becomes a link through the form', () => withLink(
    ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        const button = client.toolbar.element.querySelector('[data-control=link]');
        equal(button.disabled, false);
        equal(button.getAttribute('aria-pressed'), 'false');
        button.click();
        equal(form().hidden, false);
        form().querySelector('[name=href]').value = 'https://example.com/';
        form().querySelector('[name=target]').checked = true;
        form().querySelector('[value=apply]').click();
        equal(surface.element.innerHTML,
            '<p><a href="https://example.com/" target="_blank">one</a> two</p>');
        equal(form().hidden, true);
    }
));

test('link editor: a caret inside a link edits the whole link', () => withLink(
    ({client, surface, form}) => {
        surface.element.innerHTML = '<p><a href="/old" title="t">one</a> two</p>';
        getSelection().collapse(surface.element.querySelector('a').firstChild, 1);
        surface.core.sync();
        const button = client.toolbar.element.querySelector('[data-control=link]');
        equal(button.getAttribute('aria-pressed'), 'true');
        button.click();
        equal(form().querySelector('[name=href]').value, '/old', 'The form opens on the current value');
        equal(form().querySelector('[name=title]').value, 't');
        form().querySelector('[name=href]').value = '/new';
        form().querySelector('[value=apply]').click();
        equal(surface.element.innerHTML, '<p><a href="/new" title="t">one</a> two</p>');
    }
));

test('link editor: remove takes the link away', () => withLink(
    ({client, surface, form}) => {
        surface.element.innerHTML = '<p><a href="/old">one</a> two</p>';
        getSelection().collapse(surface.element.querySelector('a').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        form().querySelector('[value=remove]').click();
        equal(surface.element.innerHTML, '<p>one two</p>');
    }
));

test('link editor: the unlink control works without the form', () => withLink(
    ({client, surface}) => {
        surface.element.innerHTML = '<p><a href="/old">one</a> two</p>';
        const commands = client.commands(surface);
        getSelection().collapse(surface.element.querySelector('a').firstChild, 1);
        surface.core.sync();
        equal(commands.enabled('unlink'), true);
        commands.run('unlink');
        equal(surface.element.innerHTML, '<p>one two</p>');
        equal(commands.enabled('unlink'), false);
    }
));

test('link editor: applying without an address does nothing', () => withLink(
    ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        form().querySelector('[value=apply]').click();
        equal(surface.element.innerHTML, '<p>one two</p>');
        equal(form().hidden, true);
    }
));

// Native url validation would silently block the form for anything but an
// absolute http address; which protocols are acceptable is sanitizer policy.
test('link editor: relative, fragment, and scheme addresses are accepted', () => withLink(
    ({client, surface, form}) => {
        for (const href of ['/docs/page', '#section', 'mailto:a@b.c', 'tel:+41']) {
            surface.element.innerHTML = '<p>one two</p>';
            const text = surface.element.querySelector('p').firstChild;
            getSelection().setBaseAndExtent(text, 0, text, 3);
            surface.core.sync();
            client.toolbar.element.querySelector('[data-control=link]').click();
            form().querySelector('[name=href]').value = href;
            form().querySelector('[value=apply]').click();
            equal(surface.element.innerHTML, `<p><a href="${href}">one</a> two</p>`);
        }
    }
));

test('link editor: a collapsed caret outside a link cannot open the form', () => withLink(
    ({client, surface}) => {
        getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
        surface.core.sync();
        equal(client.commands(surface).enabled('editLink'), false);
        equal(client.toolbar.element.querySelector('[data-control=link]').disabled, true);
    }
));

test('link editor: escape leaves the link and the caret alone', () => withLink(
    ({client, surface, form}) => {
        surface.element.innerHTML = '<p><a href="/old">one</a> two</p>';
        const text = surface.element.querySelector('a').firstChild;
        getSelection().collapse(text, 2);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        equal(form().hidden, false);
        form().dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
        equal(form().hidden, true);
        equal(surface.element.innerHTML, '<p><a href="/old">one</a> two</p>');
        same(surface.selection.range().startContainer, text);
        equal(surface.selection.range().startOffset, 2);
    }
));

test('link editor: the form closes and is released with the module', () => withLink(
    ({client, surface, form, document: owner}) => {
        surface.element.innerHTML = '<p><a href="/old">one</a></p>';
        getSelection().collapse(surface.element.querySelector('a').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        equal(form().hidden, false);
        surface.activate(false);
        equal(form().hidden, true, 'Leaving the surface closes it');
        client.delete('link');
        equal(owner.querySelector('[data-u2-rte-link]'), null);
        equal(client.commands(surface).has('link'), false);
    }
));

function withLink(run) {
    return withFixture(
        '<div contenteditable style="--u2-rte-toolbar:link unlink"><p>one two</p></div>',
        root => {
            const core = new Rte(document, {auto: false});
            const client = new Editor(core);
            try {
                client.add(linkEditor());
                const surface = core.add(root.firstElementChild);
                const form = () => document.querySelector('[data-u2-rte-link]');
                return run({client, core, surface, form, document});
            } finally {
                client.dispose();
                core.dispose();
            }
        }
    );
}
