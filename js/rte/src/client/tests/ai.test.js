import {aiView} from '../ai.js';
import {Editor} from '../editor.js';
import {NativeSanitizer} from '../../sanitize/native.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('ai client module: validates its composition and builds independent modules', () => {
    const request = () => '';
    throws(() => aiView(), TypeError);
    throws(() => aiView({request: 'ask'}), TypeError);
    throws(() => aiView({request, diff: 'diff'}), TypeError);
    throws(() => aiView({request, prompts: 'shorten'}), TypeError);
    throws(() => aiView({request, prompts: [1]}), TypeError);
    throws(() => aiView({request, label: ' '}), TypeError);
    truthy(aiView({request}) !== aiView({request}));
    equal(aiView({request}).name, 'ai');
});

test('ai client module: asks with the surface content and applies the answer', () => withAi(
    async ({client, surface, asked, answer}) => {
        getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-command=ai]').click();
        const dialog = client.chrome.root.getElementById('ai');
        truthy(dialog.open);
        equal(dialog.querySelector('.pane div').innerHTML, '<p>one</p>\n<p>two</p>');

        answer.value = '<h2>edited</h2>';
        dialog.querySelector('[name=prompt]').value = 'shorten';
        dialog.querySelector('button[type=button]').click();
        await answer.done;
        equal(asked.at(-1).prompt, 'shorten');
        equal(asked.at(-1).html, '<p>one</p>\n<p>two</p>', 'The prompt is answered against the whole field');
        // The surface itself: what the field allows, and whatever else the application reads off it.
        // An unset element list is null — no restriction to state.
        same(asked.at(-1).surface, surface);
        equal(asked.at(-1).surface.config.block, 'p');
        equal(asked.at(-1).surface.config.elements, null);
        equal(asked.at(-1).surface.config.classes, ['lead']);

        const closed = closes(dialog);
        dialog.close('apply');
        await closed;
        equal(surface.element.innerHTML, '<h2>edited</h2>');
    }
));

test('ai client module: cancelling leaves the surface untouched', () => withAi(
    async ({client, surface, answer}) => {
        const text = surface.element.querySelector('p').firstChild;
        getSelection().collapse(text, 2);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-command=ai]').click();
        const dialog = client.chrome.root.getElementById('ai');
        answer.value = '<h2>edited</h2>';
        dialog.querySelector('[name=prompt]').value = 'shorten';
        dialog.querySelector('button[type=button]').click();
        await answer.done;

        const closed = closes(dialog);
        dialog.close('cancel');
        await closed;
        equal(surface.element.innerHTML, '<p>one</p><p>two</p>');
        same(surface.selection.range().startContainer, text, 'and leaves the caret where it was');
    }
));

test('ai client module: escape closes without emptying the field', () => withAi(
    async ({client, surface}) => {
        getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-command=ai]').click();
        const dialog = client.chrome.root.getElementById('ai');
        const closed = closes(dialog);
        dialog.close(); // what escape does: no return value at all
        await closed;
        equal(surface.element.innerHTML, '<p>one</p><p>two</p>');
    }
));

test('ai client module: a failing request is reported instead of thrown', () => withAi(
    async ({client, surface, answer}) => {
        getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-command=ai]').click();
        const dialog = client.chrome.root.getElementById('ai');
        answer.fail = new Error('no model');
        dialog.querySelector('[name=prompt]').value = 'shorten';
        dialog.querySelector('button[type=button]').click();
        await answer.done;
        equal(dialog.querySelectorAll('.pane div')[1].textContent, 'no model');
        equal(dialog.querySelector('[value=apply]').disabled, true, 'Nothing to apply');
        const closed = closes(dialog);
        dialog.close('cancel');
        await closed;
    },
));

test('ai client module: the diff pane is optional and follows edits to the answer', () => withAi(
    async ({client, surface, answer, diffs}) => {
        getSelection().collapse(surface.element.querySelector('p').firstChild, 1);
        surface.core.sync();
        client.toolbar.element.querySelector('[data-command=ai]').click();
        const dialog = client.chrome.root.getElementById('ai');
        equal(dialog.querySelectorAll('.pane').length, 3);

        answer.value = '<p>changed</p>';
        dialog.querySelector('[name=prompt]').value = 'shorten';
        dialog.querySelector('button[type=button]').click();
        await answer.done;
        equal(diffs.at(-1).edited, '<p>changed</p>');

        const pane = dialog.querySelectorAll('.pane div')[1];
        pane.innerHTML = '<p>by hand</p>';
        pane.dispatchEvent(new Event('input', {bubbles: true}));
        await Promise.resolve();
        equal(diffs.at(-1).edited, '<p>by hand</p>');
        const closed = closes(dialog);
        dialog.close('cancel');
        await closed;
    },
    {diff: true},
));

// close() queues its close event on the DOM manipulation task source, which is not ordered against
// timers. Waiting for the event itself is the only deterministic way to observe what closing did.
function closes(dialog) {
    return new Promise(resolve => dialog.addEventListener('close', () => resolve(), {once: true}));
}

function withAi(run, {diff = false, capture = null} = {}) {
    return withFixture('<div contenteditable style="--u2-rte-toolbar:ai; --u2-rte-classes:lead"><p>one</p><p>two</p></div>', root => {
        if (!NativeSanitizer.supported()) return;
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        const asked = [];
        const diffs = [];
        // The answer is settled by the test: `done` resolves once the dialog has taken it in.
        const answer = {value: '', fail: null, done: Promise.resolve()};
        const request = supplied => {
            asked.push(supplied);
            capture?.(supplied.html);
            answer.done = new Promise(resolve => queueMicrotask(() => queueMicrotask(resolve)));
            if (answer.fail) return Promise.reject(answer.fail);
            return Promise.resolve(answer.value);
        };
        const done = () => {
            client.dispose();
            core.dispose();
        };
        try {
            client.add(aiView({
                request,
                prompts: ['shorten', 'expand'],
                diff: diff ? (original, edited) => { diffs.push({original, edited}); return '<ins>diff</ins>'; } : null,
            }));
            const surface = core.add(root.firstElementChild);
            const result = run({client, core, surface, asked, diffs, answer, document});
            return result?.then ? result.finally(done) : (done(), result);
        } catch (error) {
            done();
            throw error;
        }
    });
}
