import {breakMarks, breaks} from '../breaks.js';
import {Editor} from '../editor.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

test('visible breaks extension: CSS default and toolbar toggle are view-only', () => withFixture(
    '<div contenteditable style="--u2-rte-show-breaks:true; --u2-rte-toolbar:breaks"><p>one<br>two</p></div>', root => {
        const styles = document.querySelectorAll('[data-u2-rte-breaks-style]').length;
        const markers = document.querySelectorAll('[data-u2-rte-break-marker]').length;
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        same(client.add(breaks), client);
        const surface = core.add(root.firstElementChild);
        const host = surface.element;
        truthy(host.hasAttribute('data-u2-rte-breaks'));
        equal(host.innerHTML, '<p>one<br>two</p>', 'The extension must not insert marker nodes');
        equal(document.querySelectorAll('[data-u2-rte-breaks-style]').length, styles + 1);
        equal(document.querySelectorAll('[data-u2-rte-break-marker]').length, markers + 1);

        const events = [];
        host.addEventListener('u2-rte-command', event => events.push(event.type));
        host.addEventListener('u2-rte-beforechange', event => events.push(event.type));
        host.addEventListener('u2-rte-change', event => events.push(event.type));
        getSelection().collapse(host.querySelector('p').firstChild, 1);
        core.sync();
        const button = client.toolbar.element.querySelector('[data-command=showBreaks]');
        equal(button.hidden, false);
        equal(button.getAttribute('aria-pressed'), 'true');
        button.click();
        equal(host.hasAttribute('data-u2-rte-breaks'), false);
        equal(document.querySelectorAll('[data-u2-rte-break-marker]').length, markers);
        equal(button.getAttribute('aria-pressed'), 'false');
        equal(events, ['u2-rte-command']);
        equal(host.innerHTML, '<p>one<br>two</p>');

        truthy(client.delete(breaks));
        equal(client.commands(surface).has('showBreaks'), false);
        equal(client.toolbar.element.querySelector('[data-command=showBreaks]'), null);
        equal(document.querySelectorAll('[data-u2-rte-breaks-style]').length, styles);
        client.dispose();
        core.dispose();
    }
));

test('visible breaks extension: always-on mode needs no toolbar', () => withFixture(`
    <div contenteditable style="--u2-rte-show-breaks:on; --u2-rte-ui:none"><p>one<br>two</p></div>
    <div contenteditable><p>three<br>four</p></div>
`, root => {
    const styles = document.querySelectorAll('[data-u2-rte-breaks-style]').length;
    const module = breakMarks();
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    client.add(module);
    const first = core.add(root.firstElementChild);
    const second = core.add(root.lastElementChild);
    truthy(first.element.hasAttribute('data-u2-rte-breaks'));
    equal(second.element.hasAttribute('data-u2-rte-breaks'), false);
    equal(client.toolbar, null);
    core.delete(first);
    equal(first.element.hasAttribute('data-u2-rte-breaks'), false);
    equal(document.querySelectorAll('[data-u2-rte-breaks-style]').length, styles);
    core.delete(second);
    equal(document.querySelectorAll('[data-u2-rte-breaks-style]').length, styles);
    client.dispose();
    core.dispose();
}));

test('visible breaks extension: styles stay inside a ShadowRoot', () => {
    const host = document.body.appendChild(document.createElement('div'));
    const root = host.attachShadow({mode: 'open'});
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    editable.style.setProperty('--u2-rte-show-breaks', 'true');
    editable.innerHTML = 'one<br>two';
    root.append(editable);
    const core = new Rte(root, {auto: false});
    const client = new Editor(core);
    const documentStyles = document.head.querySelectorAll('[data-u2-rte-breaks-style]').length;
    try {
        client.add(breakMarks());
        const surface = core.add(editable);
        truthy(surface.element.hasAttribute('data-u2-rte-breaks'));
        truthy(root.querySelector('[data-u2-rte-breaks-style]'));
        truthy(root.querySelector('[data-u2-rte-break-layer]'));
        truthy(root.querySelector('[data-u2-rte-break-marker]'));
        equal(document.head.querySelectorAll('[data-u2-rte-breaks-style]').length, documentStyles);
        client.dispose();
        equal(root.querySelector('[data-u2-rte-breaks-style]'), null);
        equal(editable.hasAttribute('data-u2-rte-breaks'), false);
    } finally {
        client.dispose();
        core.dispose();
        host.remove();
    }
});

test('visible breaks extension: nested surfaces own only their line breaks', () => withFixture(`
    <div contenteditable style="--u2-rte-show-breaks:true">outer<br><span contenteditable style="--u2-rte-show-breaks:false">inner<br>text</span></div>
`, root => {
    const markers = document.querySelectorAll('[data-u2-rte-break-marker]').length;
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    client.add(breakMarks());
    const outer = core.add(root.firstElementChild);
    const inner = core.add(outer.element.querySelector('[contenteditable]'));
    equal(document.querySelectorAll('[data-u2-rte-break-marker]').length, markers + 1);
    inner.element.style.setProperty('--u2-rte-show-breaks', 'true');
    core.delete(inner);
    const again = core.add(outer.element.querySelector('[contenteditable]'));
    truthy(again.element.hasAttribute('data-u2-rte-breaks'));
    equal(document.querySelectorAll('[data-u2-rte-break-marker]').length, markers + 2);
    client.dispose();
    core.dispose();
}));
