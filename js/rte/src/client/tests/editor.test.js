import {Editor} from '../editor.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('editor client: validates its core and creates no UI before activation', () => withFixture(
    '<div contenteditable style="--u2-rte-toolbar:bold"><p>onetwo</p></div>', root => {
        throws(() => new Editor(null), TypeError);
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        throws(() => new Editor(core), RangeError);
        const surface = core.add(root.firstElementChild);
        truthy(client.commands(surface)?.has('enter'));
        equal(client.commands(surface)?.input('deleteContentBackward'), 'deleteBackward');
        equal(client.commands(surface)?.input('deleteContentForward'), 'deleteForward');
        truthy(client.commands(surface)?.has('bold'));
        equal(client.toolbar, null);
        equal(client.chrome.root.querySelector('[data-u2-rte-editor-toolbar]'), null);

        const text = surface.element.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        core.sync();
        truthy(client.toolbar);
        const element = client.chrome.root.querySelector('[data-u2-rte-editor-toolbar]');
        truthy(element);
        equal(element.hidden, false);
        if (typeof element.showPopover === 'function') {
            equal(client.chrome.element.popover, 'manual', 'The chrome carries the top layer, not each piece');
            truthy(client.chrome.element.matches(':popover-open'));
        }
        element.querySelector('[data-command=bold]').click();
        equal(surface.element.innerHTML, '<p><strong>one</strong>two</p>');

        client[Symbol.dispose]();
        client.dispose();
        equal(client.connected, false);
        equal(client.commands(surface), null);
        equal(client.chrome.root.querySelector('[data-u2-rte-editor-toolbar]'), null);
        equal(client.chrome.element.isConnected, false, 'Disposing takes the whole chrome with it');
        const error = throws(() => client.add({name: 'late', commands: () => ({})}), DOMException);
        equal(error.name, 'InvalidStateError');
        const replacement = new Editor(core);
        truthy(replacement.commands(surface));
        replacement.dispose();
        core.dispose();
    }
));

test('editor client: CSS opt-in lazily installs the standard input path', () => withFixture(
    '<div contenteditable style="--u2-rte:true; --u2-rte-toolbar:bold"><p>onetwo</p></div>', root => {
        const core = new Rte(document);
        const client = new Editor(core);
        const host = root.firstElementChild;
        equal(core.get(host), null);
        equal(client.toolbar, null);
        const text = host.querySelector('p').firstChild;
        getSelection().collapse(text, 3);
        host.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
        document.dispatchEvent(new Event('selectionchange'));
        const surface = core.get(host);
        truthy(surface);
        same(core.active, surface);
        truthy(client.commands(surface));
        const input = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertParagraph',
        });
        host.dispatchEvent(input);
        truthy(input.defaultPrevented);
        equal(host.innerHTML, '<p>one</p><p>two</p>');
        getSelection().collapse(host.lastElementChild.firstChild, 0);
        const backspace = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'deleteContentBackward',
        });
        host.dispatchEvent(backspace);
        truthy(backspace.defaultPrevented);
        equal(host.innerHTML, '<p>onetwo</p>');
        client.dispose();
        core.dispose();
    }
));

test('editor client: places its toolbar from an empty continuation caret', () => withFixture(
    '<div contenteditable style="--u2-rte:true; --u2-rte-toolbar:bold"><h1>title</h1></div>', root => {
        const core = new Rte(document);
        const client = new Editor(core);
        const host = root.firstElementChild;
        getSelection().collapse(host.querySelector('h1').firstChild, 5);
        host.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
        document.dispatchEvent(new Event('selectionchange'));
        const input = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertParagraph',
        });
        host.dispatchEvent(input);
        truthy(input.defaultPrevented);
        equal(host.innerHTML, '<h1>title</h1><p><br></p>');
        truthy(/^-?[\d.]+px$/.test(client.toolbar.element.style.left));
        truthy(/^-?[\d.]+px$/.test(client.toolbar.element.style.top));
        client.dispose();
        core.dispose();
    }
));

test('editor client: plaintext surfaces remain native and allocate no toolbar', () => withFixture(
    '<div contenteditable=plaintext-only style="--u2-rte:true">text</div>', root => {
        const core = new Rte(document);
        const client = new Editor(core);
        const host = root.firstElementChild;
        host.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
        const surface = core.get(host);
        truthy(surface);
        equal(client.commands(surface), null);
        equal(client.toolbar, null);
        const input = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertParagraph',
        });
        host.dispatchEvent(input);
        equal(input.defaultPrevented, false);
        core.dispose();
        equal(client.connected, false, 'Core disposal must dispose its convention client');
    }
));

test('editor client: the convention toolbar stays in its ShadowRoot top layer', () => {
    const host = document.body.appendChild(document.createElement('div'));
    const root = host.attachShadow({mode: 'open'});
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    editable.style.setProperty('--u2-rte-toolbar', 'bold');
    editable.textContent = 'text';
    root.append(editable);
    const core = new Rte(root, {auto: false});
    const client = new Editor(core);
    try {
        const surface = core.add(editable);
        core.activate(surface);
        const chrome = root.querySelector('[data-u2-rte-chrome=editor]');
        truthy(chrome, 'The chrome belongs to the core it was made for');
        same(chrome.getRootNode(), root);
        const toolbar = client.chrome.root.querySelector('[data-u2-rte-editor-toolbar]');
        truthy(toolbar);
        truthy(client.chrome.root.querySelector('style[data-u2-rte-style=toolbar]'));
        if (typeof chrome.showPopover === 'function') truthy(chrome.matches(':popover-open'));
        client.dispose();
        equal(root.querySelector('[data-u2-rte-chrome=editor]'), null);
        equal(client.chrome.root.querySelector('[data-u2-rte-editor-toolbar]'), null);
    } finally {
        client.dispose();
        core.dispose();
        host.remove();
    }
});

test('editor client: its chrome enters a modal surface without losing activation', async () => {
    if (typeof HTMLDialogElement === 'undefined') return;
    const dialog = document.body.appendChild(document.createElement('dialog'));
    dialog.contentEditable = 'true';
    dialog.style.setProperty('--u2-rte-toolbar', 'bold');
    dialog.innerHTML = '<p>text</p>';
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    try {
        const surface = core.add(dialog);
        dialog.showModal();
        getSelection().collapse(dialog.querySelector('p').firstChild, 2);
        core.sync();
        same(client.chrome.element.parentNode, dialog);
        const button = client.toolbar.element.querySelector('[data-command=bold]');
        button.focus();
        same(core.active, surface);
        same(client.chrome.root.activeElement, button);
        const closed = new Promise(resolve => dialog.addEventListener('close', resolve, {once: true}));
        dialog.close();
        await closed;
        same(client.chrome.element.parentNode, document.body);
    } finally {
        client.dispose();
        core.dispose();
        dialog.close();
        dialog.remove();
    }
});

test('editor client: modules reach current and future surfaces and own their controls', () => withFixture(`
    <div contenteditable style="--u2-rte-toolbar:action">one</div>
    <div contenteditable style="--u2-rte-toolbar:action">two</div>
`, root => {
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    const first = core.add(root.firstElementChild);
    const contexts = [];
    let runs = 0;
    const module = {
        name: 'optional',
        commands(context) {
            contexts.push(context);
            return {action: {
                enabled: () => true,
                state: () => false,
                run: () => runs++,
            }};
        },
        toolbar: [{command: 'action', label: 'Action', text: 'A', state: true, shortcut: 'a'}],
    };

    getSelection().collapse(first.element.firstChild, 1);
    core.sync();
    truthy(client.toolbar);
    same(client.add(module), client);
    same(client.add(module), client, 'Adding the identical module must be idempotent');
    equal(contexts.length, 1);
    same(contexts[0].surface, first);
    truthy(contexts[0].pending);
    truthy(client.commands(first).has('action'));
    const button = client.toolbar.element.querySelector('[data-command=action]');
    truthy(button);
    equal(button.hidden, false);
    equal(button.getAttribute('aria-pressed'), 'false');
    button.click();
    equal(runs, 1);

    module.name = 'changed';
    module.commands = () => ({changed: {run() {}}});
    module.toolbar.push({command: 'changed', label: 'Changed', text: 'C'});
    const second = core.add(root.lastElementChild);
    equal(contexts.length, 2);
    same(contexts[1].surface, second);
    truthy(client.commands(second).has('action'));
    equal(client.commands(second).has('changed'), false, 'Registration must snapshot the module declaration');
    equal(client.toolbar.element.querySelector('[data-command=changed]'), null);
    getSelection().collapse(first.element.firstChild, 1);
    first.capture();
    equal(client.commands(first).run('bold'), true);
    truthy(client.commands(first).enabled('insertText', {data: 'x'}));
    equal(client.delete(module), true);
    equal(client.commands(first).has('action'), false);
    equal(client.commands(second).has('action'), false);
    equal(client.commands(first).enabled('insertText', {data: 'x'}), false,
        'Changing module topology must cancel transient caret formatting');
    equal(client.toolbar.element.querySelector('[data-command=action]'), null);
    equal(client.delete('optional'), false);
    client.dispose();
    core.dispose();
}));

test('editor client: extension lifecycles cover the editor and each surface', () => withFixture(`
    <div contenteditable>one</div><div contenteditable>two</div>
`, root => {
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    const first = core.add(root.firstElementChild);
    const events = [];
    const extension = {
        name: 'lifecycle',
        setup({editor, core: target, root: targetRoot}) {
            same(editor, client);
            same(target, core);
            same(targetRoot, document);
            events.push('setup');
            return {dispose() { events.push('dispose setup'); }};
        },
        attach({editor, surface, commands, pending}) {
            same(editor, client);
            truthy(commands.has('enter'));
            truthy(pending);
            events.push(`attach ${surface.element.textContent}`);
            return {dispose() { events.push(`dispose ${surface.element.textContent}`); }};
        },
    };

    same(client.add(extension), client);
    const second = core.add(root.lastElementChild);
    equal(events, ['setup', 'attach one', 'attach two']);
    core.delete(first);
    equal(events, ['setup', 'attach one', 'attach two', 'dispose one']);
    truthy(client.delete(extension));
    equal(events, ['setup', 'attach one', 'attach two', 'dispose one', 'dispose two', 'dispose setup']);
    core.delete(second);
    equal(events.length, 6, 'Deleting the module must remove its surface lifecycle');
    client.dispose();
    core.dispose();
}));

test('editor client: module validation and conflicts leave registries unchanged', () => withFixture(`
    <div contenteditable>one</div><div contenteditable>two</div>
`, root => {
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    const first = core.add(root.firstElementChild);
    const second = core.add(root.lastElementChild);
    throws(() => client.add(null), TypeError);
    throws(() => client.add({name: '', commands() { return {}; }}), TypeError);
    throws(() => client.add({name: 'empty'}), TypeError);
    throws(() => client.add({name: 'empty', setup: true}), TypeError);
    throws(() => client.add({name: 'empty', attach: true}), TypeError);
    throws(() => client.add({name: 'empty', commands() { return {}; }, toolbar: {}}), TypeError);
    throws(() => client.add({
        name: 'empty',
        commands() { return {}; },
        toolbar: [{command: '', label: 'Empty', text: 'E'}],
    }), TypeError);
    throws(() => client.add({
        name: 'empty', commands() { return {}; },
        toolbar: [{type: 'select', name: 'block', label: 'Block', options: []}],
    }), TypeError);
    throws(() => client.add({
        name: 'empty', commands() { return {}; },
        toolbar: [{type: 'menu'}],
    }), TypeError);
    throws(() => client.add({name: 'nothing', commands() { return null; }}), TypeError);
    throws(() => client.add({name: 'bad-setup', setup: () => ({})}), TypeError);
    throws(() => client.add({name: 'bad-attach',
        commands: () => ({temporary: {run() {}}}),
        attach: () => ({}),
    }), TypeError);
    equal(client.commands(first).has('temporary'), false, 'A failed attachment must roll back its commands');
    throws(() => client.add({name: 'marks', commands() { return {}; }}), RangeError);
    throws(() => client.add({
        name: 'input-conflict',
        commands: () => ({paragraph: {inputTypes: ['insertParagraph'], run() {}}}),
    }), RangeError);
    equal(client.commands(first).input('insertParagraph'), 'enter');

    let calls = 0;
    const conflict = {
        name: 'conflict',
        commands() {
            return calls++ ? {enter: {run() {}}} : {temporary: {run() {}}};
        },
    };
    throws(() => client.add(conflict), RangeError);
    equal(client.commands(first).has('temporary'), false, 'A partial installation must roll back');
    equal(client.commands(second).has('temporary'), false);

    const replacement = {name: 'conflict', commands: () => ({temporary: {run() {}}})};
    client.add(replacement);
    truthy(client.commands(first).has('temporary'));
    throws(() => client.add({name: 'conflict', commands: () => ({})}), RangeError);
    client.delete('conflict');
    client.dispose();
    core.dispose();
}));

// A `focusout` listener outside the toolbar's shadow tree sees its related
// target retargeted to that tree's host, so reaching for a control of its own
// would otherwise read as focus leaving and take the toolbar away mid-click.
test('editor client: reaching into the toolbar does not dismiss it', () => withFixture(
    '<div contenteditable style="--u2-rte-toolbar:bold"><p>one two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            const surface = core.add(root.firstElementChild);
            const text = surface.element.querySelector('p').firstChild;
            getSelection().setBaseAndExtent(text, 0, text, 3);
            core.sync();
            const toolbar = client.toolbar.element;
            equal(toolbar.hidden, false);
            surface.element.dispatchEvent(new FocusEvent('focusout', {
                bubbles: true, composed: true, relatedTarget: client.chrome.element,
            }));
            equal(toolbar.hidden, false, 'Focus went into the toolbar, not away from it');
            surface.element.dispatchEvent(new FocusEvent('focusout', {
                bubbles: true, composed: true, relatedTarget: document.body,
            }));
            equal(toolbar.hidden, true, 'Focus that really left still dismisses it');
        } finally {
            client.dispose();
            core.dispose();
        }
    }
));
