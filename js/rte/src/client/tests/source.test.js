import {sourceView} from '../source.js';
import {Editor} from '../editor.js';
import {NativeSanitizer} from '../../sanitize/native.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('source client module: opens a modal dialog on the current content', () => withSource(
    async ({client, surface, document: owner}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().collapse(text, 2);
        surface.core.sync();
        const button = client.toolbar.element.querySelector('[data-command=source]');
        truthy(button);
        equal(button.disabled, false);
        button.click();
        const dialog = owner.querySelector('[data-u2-rte-source]');
        truthy(dialog.open, 'The dialog uses the browser top layer');
        const area = dialog.querySelector('textarea');
        equal(area.value, '<p>one</p>\n<p>two</p>');
        equal(area.value.slice(0, area.selectionStart), '<p>on', 'It opens where the caret is');
        const done = closes(dialog);
        dialog.close('cancel');
        await done;
        equal(surface.element.innerHTML, '<p>one</p><p>two</p>', 'Cancelling changes nothing');
        equal(surface.selection.range().startContainer, text, 'and leaves the caret where it was');
    }
));

test('source client module: applying writes the edited text back', () => withSource(
    async ({client, surface, document: owner}) => {
        getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-command=source]').click();
        const dialog = owner.querySelector('[data-u2-rte-source]');
        const area = dialog.querySelector('textarea');
        area.value = '<h2>edited</h2>';
        const done = closes(dialog);
        dialog.close('apply');
        await done;
        equal(surface.element.innerHTML, '<h2>edited</h2>');
        equal(dialog.open, false);
    }
));

test('source client module: an edit through the dialog is one undo step', () => withSource(
    async ({client, surface, document: owner}) => {
        getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
        surface.core.sync();
        const history = client.history(surface);
        const before = history.length;
        client.toolbar.element.querySelector('[data-command=source]').click();
        const dialog = owner.querySelector('[data-u2-rte-source]');
        dialog.querySelector('textarea').value = '<p>changed</p>';
        const done = closes(dialog);
        dialog.close('apply');
        await done;
        equal(surface.element.innerHTML, '<p>changed</p>');
        equal(history.length, before + 1);
        history.undo();
        equal(surface.element.innerHTML, '<p>one</p><p>two</p>');
    }
));

test('source client module: one dialog is shared and released with the editor', () => withSource(
    async ({client, surface, document: owner}) => {
        getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
        surface.core.sync();
        const button = client.toolbar.element.querySelector('[data-command=source]');
        button.click();
        const dialog = owner.querySelector('[data-u2-rte-source]');
        let done = closes(dialog);
        dialog.close('cancel');
        await done;
        button.click();
        same(owner.querySelector('[data-u2-rte-source]'), dialog, 'The dialog is created once');
        done = closes(dialog);
        dialog.close('cancel');
        await done;
        client.delete('source');
        equal(owner.querySelector('[data-u2-rte-source]'), null);
        equal(client.commands(surface).has('source'), false);
    }
));

test('source client module: its identity is a plain module', () => {
    const module = sourceView();
    equal(module.name, 'source');
    equal(module.toolbar[0].command, 'source');
    truthy(sourceView() !== module, 'Every call builds an independent module');
    throws(() => sourceView({highlight: 'code.js'}), TypeError);
});

test('source client module: the text area is wrapped for optional highlighting', () => withSource(
    async ({client, surface, document: owner}) => {
        getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-command=source]').click();
        const dialog = owner.querySelector('[data-u2-rte-source]');
        const code = dialog.querySelector('u2-code');
        truthy(code, 'The wrapper is always present');
        same(code.firstElementChild, dialog.querySelector('textarea'));
        equal(code.getAttribute('language'), 'html');
        equal(dialog.querySelector('textarea').value, '<p>one</p>\n<p>two</p>',
            'Without the element the plain text area carries the value');
        const done = closes(dialog);
        dialog.close('cancel');
        await done;
    }
));

test('source client module: a highlighter is loaded before the first open', async () => {
    let calls = 0;
    const module = sourceView({highlight: () => { calls++; return Promise.resolve(); }});
    await withFixture('<div contenteditable style="--u2-rte-toolbar:source"><p>one</p></div>', async root => {
        if (!NativeSanitizer.supported()) return;
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            client.add(module);
            const surface = core.add(root.firstElementChild);
            getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
            core.sync();
            equal(calls, 0, 'Nothing is loaded before it is used');
            await client.commands(surface).run('source');
            equal(calls, 1);
            const dialog = document.querySelector('[data-u2-rte-source]');
            truthy(dialog.open);
            let done = closes(dialog);
            dialog.close('cancel');
            await done;
            await client.commands(surface).run('source');
            equal(calls, 1, 'The loader runs once');
            truthy(dialog.open, 'Cancelling restored the selection the command needs');
            done = closes(dialog);
            dialog.close('cancel');
            await done;
        } finally {
            client.dispose();
            core.dispose();
        }
    });
});

// close() queues its close event on the DOM manipulation task source, which is
// not ordered against timers. Waiting for the event itself is the only
// deterministic way to observe what closing did.
function closes(dialog) {
    return new Promise(resolve => dialog.addEventListener('close', () => resolve(), {once: true}));
}

function withSource(run) {
    return withFixture('<div contenteditable style="--u2-rte-toolbar:source"><p>one</p><p>two</p></div>', root => {
        if (!NativeSanitizer.supported()) return;
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        const done = () => {
            client.dispose();
            core.dispose();
        };
        try {
            client.add(sourceView());
            const surface = core.add(root.firstElementChild);
            const result = run({client, core, surface, document});
            return result?.then ? result.finally(done) : (done(), result);
        } catch (error) {
            done();
            throw error;
        }
    });
}
