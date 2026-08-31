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
        type(form(), 'href', 'https://example.com/');
        equal(surface.element.innerHTML, '<p><a href="https://example.com/">one</a> two</p>',
            'What the fields say is what the link is, as it is typed');
        const target = form().querySelector('[name=target]');
        target.checked = true;
        target.dispatchEvent(new Event('input', {bubbles: true}));
        equal(surface.element.innerHTML,
            '<p><a href="https://example.com/" target="_blank">one</a> two</p>');
        equal(form().hidden, false, 'The form stays on the link it is editing');
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
        type(form(), 'href', '/new');
        equal(surface.element.innerHTML, '<p><a href="/new" title="t">one</a> two</p>');
    }
));

// Emptying the address is how a link goes: a button for it would be a second way
// to say the same thing.
test('link editor: clearing the address takes the link away', () => withLink(
    ({client, surface, form}) => {
        surface.element.innerHTML = '<p><a href="/old">one</a> two</p>';
        getSelection().collapse(surface.element.querySelector('a').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        equal(form().querySelector('button'), null, 'The form is its fields and nothing else');
        type(form(), 'href', '');
        equal(surface.element.innerHTML, '<p>one two</p>');
        equal(form().hidden, false, 'The form stays, so the same text can be linked again');
        type(form(), 'href', '/new');
        equal(surface.element.innerHTML, '<p><a href="/new">one</a> two</p>');
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

test('link editor: an empty address makes no link', () => withLink(
    ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        type(form(), 'title', 'just a title');
        equal(surface.element.innerHTML, '<p>one two</p>');
        equal(form().hidden, false);
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
            type(form(), 'href', href);
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

test('link editor: enter leaves with the typed link and the caret back', () => withLink(
    ({client, surface, form}) => {
        surface.element.innerHTML = '<p>one two</p>';
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        type(form(), 'href', '/new');
        form().querySelector('[name=href]').dispatchEvent(
            new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
        equal(form().hidden, true);
        equal(surface.element.innerHTML, '<p><a href="/new">one</a> two</p>');
        same(surface.selection.range().startContainer.parentElement,
            surface.element.querySelector('a'), 'The caret is back in the document');
    }
));

test('link editor: validates its hooks', () => {
    throws(() => linkEditor({normalize: 'yes'}), TypeError);
    throws(() => linkEditor({suggest: 'yes'}), TypeError);
    throws(() => linkEditor({complete: 'yes'}), TypeError);
});

// Normalizing per keystroke would rewrite a half-typed address under the caret, so
// it waits until the form is done. Marking the link takes the focus away and gives
// it back on every keystroke, which rules out waiting for the field to be left.
test('link editor: an address is normalized once, when the form is done', () => withLink(
    ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        for (const typed of ['e', 'ex', 'example.com']) {
            type(form(), 'href', typed);
            equal(form().querySelector('[name=href]').value, typed, 'Typing is left alone');
            equal(surface.element.querySelector('a').getAttribute('href'), typed);
        }
        key(form(), 'Enter');
        equal(surface.element.innerHTML,
            '<p><a href="https://example.com" title="site">one</a> two</p>');
    },
    {normalize: value => value && {...value, href: `https://${value.href}`, title: 'site'}}
));

test('link editor: a new link is offered an address for its text', () => withLink(
    async ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        await new Promise(resolve => setTimeout(resolve));
        equal(form().querySelector('[name=href]').value, '/one');
        equal(surface.element.innerHTML, '<p><a href="/one">one</a> two</p>');
    },
    {suggest: selected => Promise.resolve({href: `/${selected}`})}
));

test('link editor: an existing link is never re-proposed', () => withLink(
    async ({client, surface, form}) => {
        surface.element.innerHTML = '<p><a href="/old">one</a> two</p>';
        getSelection().collapse(surface.element.querySelector('a').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        await new Promise(resolve => setTimeout(resolve));
        equal(form().querySelector('[name=href]').value, '/old');
        equal(surface.element.innerHTML, '<p><a href="/old">one</a> two</p>');
    },
    {suggest: () => Promise.resolve({href: '/proposed'})}
));

// A datalist cannot show markup, and a completion list that only offers bare
// addresses is not worth the round trip.
test('link editor: the address field offers rich entries and takes one', () => withLink(
    async ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        const field = form().querySelector('[name=href]');
        const list = form().querySelector('ul');
        equal(list.hidden, true, 'Nothing typed, nothing to offer');
        type(form(), 'href', 'ab');
        await new Promise(resolve => setTimeout(resolve, 250));
        equal(list.hidden, false);
        equal(field.getAttribute('aria-expanded'), 'true');
        equal([...list.children].map(li => li.dataset.value).join(' '), '/ab-1 /ab-2');
        equal(list.firstElementChild.querySelector('b').textContent, 'Ab one', 'Entry markup survives');
        equal(list.firstElementChild.getAttribute('aria-selected'), 'true', 'The first entry is current');
        list.children[1].click();
        equal(field.value, '/ab-2');
        equal(list.hidden, true, 'Taking an entry closes the list');
        equal(surface.element.innerHTML, '<p><a href="/ab-2">one</a> two</p>');
    },
    {complete: text => Promise.resolve([
        {value: `/${text}-1`, html: '<b>Ab one</b><i>parent</i>'},
        {value: `/${text}-2`, html: '<b>Ab two</b>'},
    ])}
));

test('link editor: the keyboard moves through the list and takes an entry', () => withLink(
    async ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        type(form(), 'href', 'ab');
        await new Promise(resolve => setTimeout(resolve, 250));
        const list = form().querySelector('ul');
        key(form(), 'ArrowDown');
        equal(list.children[1].getAttribute('aria-selected'), 'true');
        key(form(), 'ArrowDown');
        equal(list.firstElementChild.getAttribute('aria-selected'), 'true', 'Moving past the end wraps around');
        key(form(), 'Escape');
        equal(list.hidden, true, 'Escape closes the list, not the form');
        equal(form().hidden, false);
        type(form(), 'href', 'cd');
        await new Promise(resolve => setTimeout(resolve, 250));
        key(form(), 'Enter');
        equal(form().querySelector('[name=href]').value, '/cd-1');
        equal(surface.element.innerHTML, '<p><a href="/cd-1">one</a> two</p>');
    },
    {complete: text => Promise.resolve([{value: `/${text}-1`}, {value: `/${text}-2`}])}
));

// A slow answer to a word that has since changed would offer the wrong pages.
test('link editor: a late completion for an older word is dropped', () => withLink(
    async ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        type(form(), 'href', 'a');
        await new Promise(resolve => setTimeout(resolve, 200));
        type(form(), 'href', 'ab');
        await new Promise(resolve => setTimeout(resolve, 400));
        equal([...form().querySelectorAll('li')].map(li => li.dataset.value).join(' '), '/ab');
    },
    {complete: text => new Promise(resolve =>
        setTimeout(() => resolve([{value: `/${text}`}]), text === 'a' ? 300 : 10))}
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
        equal(client.chrome.root.querySelector('[data-u2-rte-link]'), null);
        equal(client.commands(surface).has('link'), false);
    }
));

// The form belongs to the link it was opened on, not to wherever the caret goes.
test('link editor: moving the selection away closes the form', () => withLink(
    ({client, surface, form}) => {
        surface.element.innerHTML = '<p><a href="/a">one</a> and <a href="/b">two</a></p>';
        getSelection().collapse(surface.element.querySelector('a').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        equal(form().hidden, false);
        equal(form().querySelector('[name=href]').value, '/a');

        getSelection().collapse(surface.element.querySelectorAll('a')[1].firstChild, 1);
        surface.core.sync();
        equal(form().hidden, true, 'Another link is not the one being edited');
    }
));

test('link editor: a live edit is one undo step, not one per keystroke', () => withLink(
    ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        const history = client.history(surface);
        const entries = history.length;
        client.toolbar.element.querySelector('[data-control=link]').click();
        for (const value of ['/', '/a', '/ab', '/abc']) type(form(), 'href', value);
        equal(surface.element.innerHTML, '<p><a href="/abc">one</a> two</p>');
        truthy(history.length - entries <= 1, `Four keystrokes left ${history.length - entries} entries`);
    }
));

// Marking the link moves the document selection into it, and an engine follows
// that with focus: without putting it back, the second character would land in
// the editor.
test('link editor: typing an address keeps the caret in its field', () => withLink(
    ({client, surface, form}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-control=link]').click();
        const field = form().querySelector('[name=href]');
        field.focus();
        for (const value of ['/', '/a', '/ab']) {
            field.value = value;
            field.dispatchEvent(new Event('input', {bubbles: true}));
            same(client.chrome.root.activeElement, field, `still typing after ${value}`);
        }
        equal(surface.element.innerHTML, '<p><a href="/ab">one</a> two</p>');
    }
));

function type(form, name, value) {
    const field = form.querySelector(`[name=${name}]`);
    field.value = value;
    field.dispatchEvent(new Event('input', {bubbles: true}));
}

function key(form, name) {
    form.dispatchEvent(new KeyboardEvent('keydown', {key: name, bubbles: true, cancelable: true}));
}

function withLink(run, options) {
    return withFixture(
        '<div contenteditable style="--u2-rte-toolbar:link unlink"><p>one two</p></div>',
        root => {
            const core = new Rte(document, {auto: false});
            const client = new Editor(core);
            const done = () => {
                client.dispose();
                core.dispose();
            };
            try {
                client.add(linkEditor(options));
                const surface = core.add(root.firstElementChild);
                const form = () => client.chrome.root.querySelector('[data-u2-rte-link]');
                const result = run({client, core, surface, form, document});
                return result?.then ? result.finally(done) : (done(), result);
            } catch (error) {
                done();
                throw error;
            }
        }
    );
}
