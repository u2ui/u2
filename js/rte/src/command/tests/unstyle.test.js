import {Commands} from '../commands.js';
import {unstyleCommand} from '../unstyle.js';
import {Rte} from '../../core/core.js';
import {Unstyle, defaultUnstyle} from '../../unstyle/unstyle.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('unstyle command: validates policy and owns native remove-format input', () => {
    throws(() => unstyleCommand({}), TypeError);
    const command = unstyleCommand(defaultUnstyle);
    equal(command.inputTypes, ['formatRemove']);
    truthy(command.enabled);
    truthy(command.state);
    truthy(command.run);
});

test('unstyle command: repeated runs advance only after the prior level is a no-op', () => withUnstyle(`
    <div contenteditable><p><span class=x style="color:red" align=center><strong>text</strong></span></p></div>
`, ({commands, host}) => {
    const text = host.querySelector('strong').firstChild;
    getSelection().setBaseAndExtent(text, 0, text, 4);
    equal(commands.state('unstyle'), 'styles');
    equal(commands.run('unstyle').level, 'styles');
    equal(host.innerHTML, '<p><span class="x" align="center"><strong>text</strong></span></p>');
    equal(commands.state('unstyle'), 'attributes');
    equal(commands.run('unstyle').level, 'attributes');
    equal(host.innerHTML, '<p><span class="x"><strong>text</strong></span></p>');
    equal(commands.run('unstyle').level, 'classes');
    equal(host.innerHTML, '<p><strong>text</strong></p>');
    equal(commands.run('unstyle').level, 'inline');
    equal(host.innerHTML, '<p>text</p>');
    equal(commands.enabled('unstyle'), false, 'Plain text in a default block is the end of the ladder');
}));

test('unstyle command: the ladder ends by reducing structure to default blocks', () => withUnstyle(
    '<div contenteditable><ul><li>one</li><li>two<em>!</em></li></ul></div>', ({commands, host}) => {
        const range = document.createRange();
        range.selectNodeContents(host);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        equal(commands.state('unstyle'), 'inline');
        commands.run('unstyle');
        equal(host.innerHTML, '<ul><li>one</li><li>two!</li></ul>');
        equal(commands.state('unstyle'), 'blocks');
        commands.run('unstyle');
        equal(host.innerHTML, '<p>one</p><p>two!</p>');
        equal(commands.enabled('unstyle'), false);
    }
));

test('unstyle command: headings, quotes, and tables reduce the same way', () => withUnstyle(
    '<div contenteditable><h2>title</h2><blockquote><p>quote</p></blockquote>'
    + '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table></div>',
    ({commands, host}) => {
        const range = document.createRange();
        range.selectNodeContents(host);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        equal(commands.state('unstyle'), 'blocks');
        commands.run('unstyle');
        equal(host.innerHTML, '<p>title</p><p>quote</p><p>a</p><p>b</p>');
        equal(commands.enabled('unstyle'), false);
    }
));

test('unstyle command: a block keeps its own content beside a nested structure', () => withUnstyle(
    '<div contenteditable><ul><li>text<ul><li>nested</li></ul></li></ul></div>', ({commands, host}) => {
        const range = document.createRange();
        range.selectNodeContents(host);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        commands.run('unstyle');
        equal(host.innerHTML, '<p>text</p><p>nested</p>');
    }
));

test('unstyle command: atomic blocks are content and stay', () => withUnstyle(
    '<div contenteditable><h2>title</h2><hr></div>', ({commands, host}) => {
        const range = document.createRange();
        range.selectNodeContents(host);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        commands.run('unstyle');
        equal(host.innerHTML, '<p>title</p><hr>');
    }
));

test('unstyle command: the structural rung can be left out', () => withFixture(
    '<div contenteditable><h2>title</h2></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const commands = new Commands(surface, {commands: {unstyle: unstyleCommand(defaultUnstyle, {blocks: false})}});
        const range = document.createRange();
        range.selectNodeContents(host);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        equal(commands.enabled('unstyle'), false);
        equal(host.innerHTML, '<h2>title</h2>');
        core.dispose();
    }
));

test('unstyle command: partial cleanup isolates only selected inline content', () => withUnstyle(
    '<div contenteditable><p><span class=x>hello</span></p></div>', ({commands, host}) => {
        const text = host.querySelector('span').firstChild;
        getSelection().setBaseAndExtent(text, 4, text, 1);
        const result = commands.run('unstyle');
        equal(result.level, 'classes');
        equal(host.innerHTML, '<p><span class="x">h</span>ell<span class="x">o</span></p>');
        const selection = getSelection();
        const range = selection.getRangeAt(0);
        equal(selection.toString(), 'ell');
        same(selection.anchorNode, range.endContainer);
        equal(selection.anchorOffset, range.endOffset);
        same(selection.focusNode, range.startContainer);
        equal(selection.focusOffset, range.startOffset);
    }
));

test('unstyle command: partial block selection does not alter the whole block', () => withUnstyle(
    '<div contenteditable><p class=layout>hello</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 1, text, 4);
        equal(commands.enabled('unstyle'), false);
        equal(commands.run('unstyle'), undefined);
        equal(host.innerHTML, '<p class="layout">hello</p>');
        getSelection().setBaseAndExtent(text, 0, text, 5);
        truthy(commands.enabled('unstyle'));
        equal(commands.run('unstyle').level, 'classes');
        equal(host.innerHTML, '<p>hello</p>');
    }
));

test('unstyle command: custom wrapper policy preserves unrelated outer structure', () => withUnstyle(
    '<div contenteditable><p><mark data-note=keep>one</mark><code>two</code></p></div>', ({surface, host}) => {
        const policy = new Unstyle([{name: 'marks', elements: ['mark']}]);
        const commands = new Commands(surface, {commands: {custom: unstyleCommand(policy)}});
        const mark = host.querySelector('mark').firstChild;
        const code = host.querySelector('code').firstChild;
        getSelection().setBaseAndExtent(mark, 0, code, 3);
        equal(commands.run('custom').level, 'marks');
        equal(host.innerHTML, '<p>one<code>two</code></p>');
    }
));

test('unstyle command: element levels never unwrap structural blocks', () => withUnstyle(
    '<div contenteditable><p>text</p></div>', ({surface, host}) => {
        const policy = new Unstyle([{name: 'blocks', elements: ['p']}]);
        const commands = new Commands(surface, {commands: {custom: unstyleCommand(policy)}});
        const text = host.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 4);
        equal(commands.enabled('custom'), false);
        equal(commands.run('custom'), undefined);
        equal(host.innerHTML, '<p>text</p>');
    }
));

test('unstyle command: nested editable content stays isolated', () => withUnstyle(`
    <div contenteditable><p><span class=x>outer</span><span contenteditable><b class=x>inner</b></span></p></div>
`, ({commands, host}) => {
    const outer = host.querySelector('span:not([contenteditable])').firstChild;
    const boundary = host.querySelector('[contenteditable]');
    const range = document.createRange();
    range.setStart(outer, 0);
    range.setEndAfter(boundary);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    commands.run('unstyle');
    equal(host.innerHTML, '<p>outer<span contenteditable=""><b class="x">inner</b></span></p>');
}));

test('unstyle command: the host\'s declared content classes survive', () => withUnstyle(
    '<div contenteditable style="--u2-rte-classes: lead"><p><span class="lead pasted">one</span> two</p></div>',
    ({commands, host}) => {
        const span = host.querySelector('span');
        getSelection().setBaseAndExtent(span.firstChild, 0, host.querySelector('p').lastChild, 4);
        equal(commands.state('unstyle'), 'classes');
        commands.run('unstyle');
        equal(host.innerHTML, '<p><span class="lead">one</span> two</p>');
        equal(commands.state('unstyle'), 'contentClasses',
            'The ladder continues into the application\'s own presentation');
        commands.run('unstyle');
        equal(host.innerHTML, '<p>one two</p>', 'and takes the declared class with its wrapper');
    }
));

// Someone who presses with nothing selected wants the content cleaned, not
// nothing to happen.
test('unstyle command: a collapsed caret reaches the whole content', () => withUnstyle(
    '<div contenteditable><p><span class=x>one</span></p><p style="color:red">two</p></div>',
    ({commands, host}) => {
        const text = host.querySelector('span').firstChild;
        getSelection().collapse(text, 2);
        equal(commands.state('unstyle'), 'styles');
        commands.run('unstyle');
        equal(host.innerHTML, '<p><span class="x">one</span></p><p>two</p>');
        equal(commands.run('unstyle').level, 'classes');
        equal(host.innerHTML, '<p>one</p><p>two</p>');
        equal(commands.enabled('unstyle'), false, 'Plain content in default blocks is the end');
    }
));

test('unstyle command: the caret stays where it was', () => withUnstyle(
    '<div contenteditable><p>one <span class=x>two</span> three</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().collapse(text, 2);
        commands.run('unstyle');
        equal(host.innerHTML, '<p>one two three</p>');
        const selection = getSelection();
        truthy(selection.isCollapsed, 'The whole document is not left selected');
        equal(selection.focusNode.data.slice(0, selection.focusOffset), 'on');
    }
));

test('unstyle command: a caret reaches the structural rung too', () => withUnstyle(
    '<div contenteditable><ul><li>one</li><li>two</li></ul></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('li').firstChild, 1);
        equal(commands.state('unstyle'), 'blocks');
        commands.run('unstyle');
        equal(host.innerHTML, '<p>one</p><p>two</p>');
    }
));

function withUnstyle(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const commands = new Commands(surface, {commands: {unstyle: unstyleCommand()}});
        try {
            return run({commands, core, host, surface});
        } finally {
            core.dispose();
        }
    });
}
