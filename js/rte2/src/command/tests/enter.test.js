import {Commands} from '../commands.js';
import {enter, lineBreak} from '../enter.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

test('enter: splits its block and moves the caret into the new one', () => withCommands(
    '<div contenteditable><p>onetwo</p></div>', ({commands, host}) => {
        caret(host.firstElementChild.firstChild, 3);
        same(commands.run('enter'), host.lastElementChild);
        equal(host.innerHTML, '<p>one</p><p>two</p>');
        same(getSelection().anchorNode, host.lastElementChild.firstChild);
        equal(getSelection().anchorOffset, 0);
        truthy(getSelection().isCollapsed);
    }
));

test('enter: a block left empty by the split keeps a caret position', () => withCommands(
    '<div contenteditable><p id=one>text</p><p id=two>text</p></div>', ({commands, host}) => {
        caret(host.querySelector('#one').firstChild, 0);
        commands.run('enter');
        equal(host.firstElementChild.outerHTML, '<p id="one"><br></p>', 'The leading block must stay visible');
        caret(host.querySelector('#two').firstChild, 4);
        commands.run('enter');
        const created = host.lastElementChild;
        equal(created.outerHTML, '<p><br></p>');
        same(getSelection().anchorNode, created);
        equal(getSelection().anchorOffset, 0, 'The caret belongs before the filler break');
    }
));

test('enter: splitting keeps the inline context on both sides', () => withCommands(
    '<div contenteditable><p>one<em>two</em>three</p></div>', ({commands, host}) => {
        caret(host.querySelector('em').firstChild, 1);
        commands.run('enter');
        equal(host.innerHTML, '<p>one<em>t</em></p><p><em>wo</em>three</p>');
        same(getSelection().anchorNode, host.lastElementChild.querySelector('em').firstChild);
        equal(getSelection().anchorOffset, 0);
    }
));

test('enter: the host policy decides which element is split', () => withFixture(`
    <ul id=list contenteditable><li><p>onetwo</p></li></ul>
    <div id=wrapped contenteditable><div class=layout><p>onetwo</p></div></div>
    <div id=cells contenteditable><table><tbody><tr><td>onetwo</td></tr></tbody></table></div>
`, root => {
    const core = new Rte(document, {auto: false});
    for (const [id, expected] of [
        ['list', '<li><p>one</p></li><li><p>two</p></li>'],
        ['wrapped', '<div class="layout"><p>one</p><p>two</p></div>'],
        ['cells', '<table><tbody><tr><td>one<br>two</td></tr></tbody></table>'],
    ]) {
        const host = root.querySelector(`#${id}`);
        const commands = new Commands(core.add(host), {commands: {enter}});
        caret(host.querySelector('td, p').firstChild, 3);
        commands.run('enter');
        equal(host.innerHTML, expected, `${id} did not follow its host policy`);
    }
    core.dispose();
}));

test('enter: an inline-only host and a host without blocks insert a break', () => withFixture(`
    <p id=inline contenteditable>onetwo</p>
    <div id=none contenteditable style="--u2-rte-block: none">onetwo</div>
`, root => {
    const core = new Rte(document, {auto: false});
    for (const id of ['inline', 'none']) {
        const host = root.querySelector(`#${id}`);
        const commands = new Commands(core.add(host), {commands: {enter}});
        caret(host.firstChild, 3);
        commands.run('enter');
        equal(host.innerHTML, 'one<br>two', `${id} did not fall back to a line break`);
    }
    core.dispose();
}));

test('enter: a break at the end of its block stays visible', () => withCommands(
    '<div contenteditable><p>text</p></div>', ({commands, host}) => {
        const block = host.firstElementChild;
        caret(block.firstChild, 4);
        same(commands.run('lineBreak'), block.querySelector('br'));
        equal(block.innerHTML, 'text<br><br>');
        same(getSelection().anchorNode, block);
        equal(getSelection().anchorOffset, 2, 'The caret belongs between both breaks');
        commands.run('lineBreak');
        equal(block.innerHTML, 'text<br><br><br>', 'A following break is content of its own');
        equal(getSelection().anchorOffset, 3);
    }
));

test('enter: a break inside content needs no filler', () => withCommands(
    '<div contenteditable><p>onetwo</p></div>', ({commands, host}) => {
        caret(host.firstElementChild.firstChild, 3);
        commands.run('lineBreak');
        equal(host.firstElementChild.innerHTML, 'one<br>two');
        same(getSelection().anchorNode, host.firstElementChild.lastChild);
        equal(getSelection().anchorOffset, 0);
    }
));

test('enter: selections and atomic content keep their native behavior', () => withCommands(
    '<div contenteditable><p>onetwo</p><p><button>label</button></p></div>', ({commands, host}) => {
        const text = host.firstElementChild.firstChild;
        getSelection().setBaseAndExtent(text, 1, text, 4);
        equal(commands.enabled('enter'), false, 'A selection would have to be deleted first');
        equal(commands.enabled('lineBreak'), false);
        caret(host.querySelector('button').firstChild, 2);
        equal(commands.enabled('enter'), false, 'Atomic content is indivisible');
        getSelection().removeAllRanges();
        equal(commands.enabled('enter'), false);
        equal(host.innerHTML, '<p>onetwo</p><p><button>label</button></p>');
    }
));

test('enter: the split reports both blocks as dirty', () => withCommands(
    '<div contenteditable><p>onetwo</p></div>', ({commands, host}) => {
        let dirty = [];
        host.addEventListener('u2-rte-change', event => dirty = event.detail.transaction.dirty);
        caret(host.firstElementChild.firstChild, 3);
        commands.run('enter');
        equal(dirty.map(node => node.nodeName), ['P', 'P']);
        same(dirty[0], host.firstElementChild);
        same(dirty[1], host.lastElementChild);
    }
));

function caret(node, offset) {
    getSelection().removeAllRanges();
    const range = document.createRange();
    range.setStart(node, offset);
    getSelection().addRange(range);
}

function withCommands(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = new Commands(core.add(host), {commands: {enter, lineBreak}});
        try {
            return run({core, commands, host, root});
        } finally {
            core.dispose();
        }
    });
}
