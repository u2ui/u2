import {History} from '../history.js';
import {Commands} from '../../command/commands.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('history: validates its surface and options', () => withSurface('<div contenteditable><p>one</p></div>', ({surface}) => {
    throws(() => new History(null), TypeError);
    throws(() => new History({element: document.createElement('p')}), TypeError);
    throws(() => new History(surface, {limit: 1}), RangeError);
    throws(() => new History(surface, {limit: 2.5}), RangeError);
    throws(() => new History(surface, {coalesce: -1}), RangeError);
}));

test('history: starts with one baseline entry and records only real changes', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface);
        equal(history.length, 1);
        equal(history.index, 0);
        equal(history.canUndo, false);
        equal(history.canRedo, false);
        equal(history.record(), false, 'An unchanged surface adds no entry');
        host.firstElementChild.append(' two');
        equal(history.record(), true);
        equal(history.length, 2);
        equal(history.canUndo, true);
        equal(history.record(), false);
    }
));

test('history: undo and redo restore content and selection', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface);
        const text = host.firstElementChild.firstChild;
        getSelection().setBaseAndExtent(text, 3, text, 3);
        surface.capture();
        text.data = 'one two';
        getSelection().setBaseAndExtent(text, 7, text, 7);
        history.record();
        equal(history.undo(), true);
        equal(host.innerHTML, '<p>one</p>');
        equal(getSelection().focusOffset, 3, 'The baseline adopted the first selection it saw');
        equal(history.canUndo, false);
        equal(history.redo(), true);
        equal(host.innerHTML, '<p>one two</p>');
        equal(getSelection().focusOffset, 7);
        equal(history.redo(), false);
    }
));

test('history: a restored selection keeps its backward direction', () => withSurface(
    '<div contenteditable><p>one two</p></div>', ({surface, host}) => {
        const history = new History(surface);
        const text = host.firstElementChild.firstChild;
        getSelection().setBaseAndExtent(text, 7, text, 4);
        surface.capture();
        history.record();
        host.firstElementChild.textContent = 'other';
        history.record();
        history.undo();
        const selection = getSelection();
        equal(selection.anchorOffset, 7);
        equal(selection.focusOffset, 4);
    }
));

test('history: selection addresses survive replaced content', () => withSurface(
    '<div contenteditable><p>one</p><p>two</p></div>', ({surface, host}) => {
        const history = new History(surface);
        const text = host.lastElementChild.firstChild;
        getSelection().setBaseAndExtent(text, 1, text, 3);
        surface.capture();
        history.record();
        host.replaceChildren();
        history.record();
        history.undo();
        const selection = getSelection();
        truthy(selection.anchorNode !== text, 'Undo rebuilds nodes instead of reusing them');
        same(selection.anchorNode, host.lastElementChild.firstChild);
        equal(selection.anchorOffset, 1);
        equal(selection.focusOffset, 3);
    }
));

test('history: commands become discrete steps and input transactions coalesce', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface, {coalesce: 10000});
        surface.transact(() => host.firstElementChild.append('!'), {trigger: 'command'});
        equal(history.length, 2, 'A command records its result immediately');
        surface.transact(() => host.firstElementChild.append('?'), {trigger: 'input'});
        equal(history.length, 2, 'Ordinary input waits for its interval');
        surface.transact(() => host.firstElementChild.append('#'), {trigger: 'paste'});
        equal(history.length, 4, 'The pending input is committed before the paste');
        equal(history.index, 3);
        history.undo();
        equal(host.innerHTML, '<p>one!?</p>');
        history.undo();
        equal(host.innerHTML, '<p>one!</p>');
        history.undo();
        equal(host.innerHTML, '<p>one</p>');
    }
));

test('history: coalescing commits one entry per interval', async () => withSurface(
    '<div contenteditable><p>one</p></div>', async ({surface, host}) => {
        const history = new History(surface, {coalesce: 20});
        host.firstElementChild.append('a');
        await delay(5);
        host.firstElementChild.append('b');
        equal(history.length, 1, 'Both mutations stay inside the open interval');
        await delay(40);
        equal(history.length, 2);
        equal(history.index, 1);
        history.undo();
        equal(host.innerHTML, '<p>one</p>');
    }
));

test('history: undo commits uncommitted input first', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface, {coalesce: 10000});
        host.firstElementChild.append(' two');
        equal(history.canUndo, true, 'Pending input is undoable before its interval ends');
        history.undo();
        equal(host.innerHTML, '<p>one</p>');
        history.redo();
        equal(host.innerHTML, '<p>one two</p>');
    }
));

test('history: recording drops the redo branch', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface);
        host.firstElementChild.append('a');
        history.record();
        host.firstElementChild.append('b');
        history.record();
        history.undo();
        equal(history.canRedo, true);
        host.firstElementChild.append('c');
        equal(history.canRedo, false, 'Pending input already invalidates the branch');
        history.record();
        equal(history.length, 3);
        equal(host.innerHTML, '<p>oneac</p>');
        equal(history.canRedo, false);
    }
));

test('history: the limit drops the oldest entry', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface, {limit: 3});
        for (const letter of 'abcd') {
            host.firstElementChild.append(letter);
            history.record();
        }
        equal(history.length, 3);
        equal(history.index, 2);
        history.undo();
        history.undo();
        equal(host.innerHTML, '<p>oneab</p>', 'Only the entries within the limit remain');
        equal(history.canUndo, false);
    }
));

test('history: host attributes are not editable content', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface);
        host.classList.add('busy');
        host.setAttribute('spellcheck', 'false');
        equal(history.record(), false, 'The host belongs to the application');
        equal(history.canUndo, false);
        host.firstElementChild.setAttribute('dir', 'rtl');
        equal(history.record(), true, 'Attributes inside the content are edits');
        history.undo();
        equal(host.innerHTML, '<p>one</p>');
        equal(host.className, 'busy', 'Undo leaves the host untouched');
    }
));

test('history: applying an entry never records itself', () => withSurface(
    '<div contenteditable><p>one</p></div>', async ({surface, host}) => {
        const history = new History(surface, {coalesce: 5});
        host.firstElementChild.append('a');
        history.record();
        history.undo();
        await delay(20);
        equal(history.length, 2);
        equal(history.index, 0);
        equal(history.canRedo, true);
    }
));

test('history: reports its changes on the surface', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface);
        const seen = [];
        surface.addEventListener('u2-rte-history', event => seen.push(event.detail.history));
        host.firstElementChild.append('a');
        history.record();
        history.undo();
        equal(seen.length, 2);
        same(seen[0], history);
    }
));

test('history: clear resets to the current content', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface);
        host.firstElementChild.append('a');
        history.record();
        same(history.clear(), history);
        equal(history.length, 1);
        equal(history.canUndo, false);
        equal(history.canRedo, false);
        equal(host.innerHTML, '<p>onea</p>');
    }
));

test('history: exposes undo and redo as ordinary commands', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface);
        const {undo, redo} = history.commands;
        const edit = () => ({range: {}});
        equal(undo.inputTypes, ['historyUndo']);
        equal(redo.inputTypes, ['historyRedo']);
        equal(undo.transaction, false);
        equal(undo.enabled(edit()), false);
        host.firstElementChild.append('a');
        history.record();
        equal(undo.enabled(edit()), true);
        equal(undo.enabled({range: null}), false, 'A surface without the selection never steps');
        equal(undo.run(), true);
        equal(host.innerHTML, '<p>one</p>');
        equal(redo.enabled(edit()), true);
        equal(redo.run(), true);
        equal(host.innerHTML, '<p>onea</p>');
    }
));

test('history: a shortcut never reaches a surface the user has left', () => withFixture(
    '<div id=one contenteditable><p>one</p></div><div id=two contenteditable><p>two</p></div>',
    root => {
        const core = new Rte(document, {auto: false});
        try {
            const first = core.add(root.querySelector('#one'));
            const second = core.add(root.querySelector('#two'));
            const history = new History(first);
            const commands = new Commands(first, {commands: history.commands});
            first.element.firstElementChild.append('!');
            history.record();
            getSelection().collapse(second.element.firstElementChild.firstChild, 1);
            equal(commands.enabled('undo'), false, 'The selection belongs to another surface');
            commands.run('undo');
            equal(first.element.innerHTML, '<p>one!</p>', 'Running it anyway changes nothing');
            getSelection().collapse(first.element.firstElementChild.firstChild, 1);
            equal(commands.enabled('undo'), true);
            commands.run('undo');
            equal(first.element.innerHTML, '<p>one</p>');
        } finally {
            core.dispose();
        }
    }
));

test('history: dispose stops observing and releases its entries', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({surface, host}) => {
        const history = new History(surface);
        history.dispose();
        equal(history.connected, false);
        equal(history.length, 0);
        host.firstElementChild.append('a');
        equal(history.record(), false);
        equal(history.undo(), false);
        history.dispose();
    }
));

test('history: a disconnected surface disposes its history', () => withSurface(
    '<div contenteditable><p>one</p></div>', ({core, surface}) => {
        const history = new History(surface);
        core.delete(surface);
        equal(history.connected, false);
    }
));

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function withSurface(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const done = () => core.dispose();
        try {
            const result = run({core, surface: core.add(host), host, root});
            return result?.then ? result.finally(done) : (done(), result);
        } catch (error) {
            done();
            throw error;
        }
    });
}
