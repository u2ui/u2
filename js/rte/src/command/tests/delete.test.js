import {Commands} from '../commands.js';
import {deleteBackward, deleteForward} from '../delete.js';
import {Rte} from '../../core/core.js';
import {ContentModel} from '../../model/content-model.js';
import {equal, same, test, withFixture} from '../../../tests/harness.js';

test('delete backward: every caret representation in an empty block merges identically', () => withFixture(`
    <ul id=before contenteditable><li><br></li><li><br></li></ul>
    <ul id=after contenteditable><li><br></li><li><br></li></ul>
`, root => {
    const core = new Rte(document, {auto: false});
    for (const [id, offset] of [['before', 0], ['after', 1]]) {
        const host = root.querySelector(`#${id}`);
        const commands = registry(core, host);
        caret(host.lastElementChild, offset);
        same(commands.run('deleteBackward'), host.firstElementChild);
        equal(host.innerHTML, '<li><br></li>', `${id} treated one visual caret as two boundaries`);
        same(getSelection().anchorNode, host.firstElementChild);
        equal(getSelection().anchorOffset, 0);
    }
    core.dispose();
}));

test('delete backward: merges nested structural and text blocks at their leading boundary', () => withFixture(`
    <div id=list contenteditable><ul><li>one</li><li><p>two</p></li></ul></div>
    <div id=blocks contenteditable><p>one</p><h1>two</h1></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const list = root.querySelector('#list');
    caret(list.querySelector('p').firstChild, 0);
    registry(core, list).run('deleteBackward');
    equal(list.innerHTML, '<ul><li>one<p>two</p></li></ul>');
    same(getSelection().anchorNode, list.querySelector('li'));
    equal(getSelection().anchorOffset, 1);

    const blocks = root.querySelector('#blocks');
    caret(blocks.lastElementChild.firstChild, 0);
    registry(core, blocks).run('deleteBackward');
    equal(blocks.innerHTML, '<p>onetwo</p>');
    same(getSelection().anchorNode, blocks.firstElementChild);
    equal(getSelection().anchorOffset, 1);
    core.dispose();
}));

test('delete forward: every caret representation in an empty block merges identically', () => withFixture(`
    <ul id=before contenteditable><li><br></li><li><br></li></ul>
    <ul id=after contenteditable><li><br></li><li><br></li></ul>
`, root => {
    const core = new Rte(document, {auto: false});
    for (const [id, offset] of [['before', 0], ['after', 1]]) {
        const host = root.querySelector(`#${id}`);
        const commands = registry(core, host);
        caret(host.firstElementChild, offset);
        same(commands.run('deleteForward'), host.firstElementChild);
        equal(host.innerHTML, '<li><br></li>', `${id} treated one visual caret as two boundaries`);
        same(getSelection().anchorNode, host.firstElementChild);
        equal(getSelection().anchorOffset, 0);
    }
    core.dispose();
}));

test('delete forward: merges nested structural and text blocks at their trailing boundary', () => withFixture(`
    <div id=list contenteditable><ul><li><p>one</p></li><li>two</li></ul></div>
    <div id=blocks contenteditable><p>one</p><h1>two</h1></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const list = root.querySelector('#list');
    caret(list.querySelector('p').firstChild, 3);
    registry(core, list).run('deleteForward');
    equal(list.innerHTML, '<ul><li><p>one</p>two</li></ul>');
    same(getSelection().anchorNode, list.querySelector('li'));
    equal(getSelection().anchorOffset, 1);

    const blocks = root.querySelector('#blocks');
    caret(blocks.firstElementChild.firstChild, 3);
    registry(core, blocks).run('deleteForward');
    equal(blocks.innerHTML, '<p>onetwo</p>');
    same(getSelection().anchorNode, blocks.firstElementChild);
    equal(getSelection().anchorOffset, 1);
    core.dispose();
}));

test('collapsed deletion: neutral nodes do not separate visual block neighbors', () => withFixture(`
    <div id=back contenteditable><p>one</p> \n <!-- gap --><p>two</p></div>
    <div id=forward contenteditable><p>one</p> \n <!-- gap --><p>two</p></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const back = root.querySelector('#back');
    caret(back.lastElementChild.firstChild, 0);
    registry(core, back).run('deleteBackward');
    equal(back.innerHTML, '<p>onetwo</p>');

    const forward = root.querySelector('#forward');
    caret(forward.firstElementChild.firstChild, 3);
    registry(core, forward).run('deleteForward');
    equal(forward.innerHTML, '<p>onetwo</p>');
    core.dispose();
}));

test('delete backward: ordinary deletion, selections, first blocks, and atomic content stay native', () => withFixture(
    '<div contenteditable><p>one</p><p>two<button>label</button></p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = registry(core, host);
        const first = host.firstElementChild.firstChild;
        caret(first, 1);
        equal(commands.enabled('deleteBackward'), false, 'Character deletion must stay native');
        caret(first, 0);
        equal(commands.enabled('deleteBackward'), false, 'There is no preceding block to merge');
        getSelection().setBaseAndExtent(first, 0, first, 1);
        equal(commands.enabled('deleteBackward'), false, 'A range needs a range deletion command');
        caret(host.querySelector('button').firstChild, 0);
        equal(commands.enabled('deleteBackward'), false, 'Atomic content is indivisible');
        caret(host.firstElementChild.firstChild, 1);
        equal(commands.enabled('deleteForward'), false, 'Forward character deletion must stay native');
        caret(host.lastElementChild, host.lastElementChild.childNodes.length);
        equal(commands.enabled('deleteForward'), false, 'There is no following block to merge');
        core.dispose();
    }
));

test('delete backward: content policy controls custom blocks and rejects invalid joins', () => withFixture(
    '<div contenteditable><x-line>one</x-line><x-line><x-child>two</x-child></x-line></div>', root => {
        const model = new ContentModel({rules: {
            div: {children: ['x-line']},
            'x-line': {children: ['#text'], block: true, mergeable: true},
            'x-child': {children: ['#text']},
        }});
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = registry(core, host, model);
        caret(host.lastElementChild, 0);
        equal(commands.enabled('deleteBackward'), false);
        caret(host.firstElementChild, 1);
        equal(commands.enabled('deleteForward'), false);
        equal(host.innerHTML, '<x-line>one</x-line><x-line><x-child>two</x-child></x-line>');
        core.dispose();
    }
));

test('delete: backspace removes an atomic block before the caret', () => withFixture(
    '<div contenteditable><p>one</p><hr><p>two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = registry(core, host);
        const text = host.lastElementChild.firstChild;
        caret(text, 0);
        equal(commands.enabled('deleteBackward'), true);
        commands.run('deleteBackward');
        equal(host.innerHTML, '<p>one</p><p>two</p>');
        same(getSelection().focusNode, text, 'The caret stays where it was');
        equal(getSelection().focusOffset, 0);
        core.dispose();
    }
));

test('delete: forward delete removes an atomic block after the caret', () => withFixture(
    '<div contenteditable><p>one</p><hr><p>two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = registry(core, host);
        caret(host.firstElementChild.firstChild, 3);
        equal(commands.enabled('deleteForward'), true);
        commands.run('deleteForward');
        equal(host.innerHTML, '<p>one</p><p>two</p>');
        // The paragraphs are only joined by a second press.
        commands.run('deleteForward');
        equal(host.innerHTML, '<p>onetwo</p>');
        core.dispose();
    }
));

test('delete: an atomic block is removed before an unrelated merge is considered', () => withFixture(
    '<div contenteditable><ul><li>one</li></ul><hr><p>two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = registry(core, host);
        caret(host.lastElementChild.firstChild, 0);
        commands.run('deleteBackward');
        equal(host.innerHTML, '<ul><li>one</li></ul><p>two</p>');
        equal(commands.enabled('deleteBackward'), false, 'A list and a paragraph do not merge');
        core.dispose();
    }
));

test('delete: an atomic block at the very edge of the host is removable', () => withFixture(
    '<div contenteditable><hr><p>one</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = registry(core, host);
        caret(host.lastElementChild.firstChild, 0);
        commands.run('deleteBackward');
        equal(host.innerHTML, '<p>one</p>');
        equal(commands.enabled('deleteBackward'), false);
        core.dispose();
    }
));

function registry(core, host, model) {
    return new Commands(core.add(host), {model, commands: {deleteBackward, deleteForward}});
}

function caret(node, offset) {
    getSelection().removeAllRanges();
    const range = document.createRange();
    range.setStart(node, offset);
    getSelection().addRange(range);
}

// Clicking a rule leaves the caret inside it in some engines: a position at an
// element that has no inside, where nothing was deletable at all.
test('delete: a caret an engine left inside a rule removes it', () => withFixture(
    '<div contenteditable><p>one</p><hr><p>two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = registry(core, host);
        caret(host.querySelector('hr'), 0);
        equal(commands.enabled('deleteBackward'), true);
        commands.run('deleteBackward');
        equal(host.innerHTML, '<p>one</p><p>two</p>');
        core.dispose();
    }
));
