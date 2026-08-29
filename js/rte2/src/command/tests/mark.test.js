import {applyMark, removeMark, toggleMark} from '../mark.js';
import {Commands} from '../commands.js';
import {MarkAdapter} from '../../mark/dom-adapter.js';
import {MarkType} from '../../mark/mark.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('mark command: decorates complete inline elements and wraps bare text', () => withMarks(
    '<ul contenteditable><li>hello</li><li><b>dear</b> world</li></ul>', ({commands, host}) => {
        const first = host.children[0].firstChild;
        const last = host.querySelector('b').firstChild;
        select(first, 2, last, 4);
        const changed = commands.run('applyX');
        equal(host.innerHTML, '<li>he<span class="x">llo</span></li><li><b class="x">dear</b> world</li>');
        equal(changed.map(element => element.localName), ['span', 'b']);
        equal(getSelection().toString(), 'llo\ndear');
        same(getSelection().anchorNode, host.querySelector('span').firstChild);
        same(getSelection().focusNode, host.querySelector('b').firstChild);
    }
));

test('mark command: reuse preserves the existing inline tag', () => withMarks(
    '<div contenteditable><p><span>one</span> <em>two</em></p></div>', ({commands, host}) => {
        const range = document.createRange();
        range.selectNodeContents(host.firstElementChild);
        selectRange(range);
        commands.run('applyX');
        equal(host.innerHTML, '<p><span class="x">one </span><em class="x">two</em></p>');
    }
));

test('mark command: reuse stays inside model-defined editable inline content', () => withMarks(
    '<div contenteditable><p><em>one</em><a href=/two>two</a><img alt=three><span contenteditable>nested</span></p></div>',
    ({commands, host}) => {
        const range = document.createRange();
        range.selectNodeContents(host.firstElementChild);
        selectRange(range);
        commands.run('applyX');
        equal(host.innerHTML, '<p><em class="x">one</em><a href="/two" class="x">two</a><img alt="three"><span contenteditable="">nested</span></p>');
    }
));

test('mark command: a partially selected inline element is not decorated as a whole', () => withMarks(
    '<div contenteditable><p><b>hello</b></p></div>', ({commands, host}) => {
        const text = host.querySelector('b').firstChild;
        select(text, 1, text, 4);
        commands.run('applyX');
        equal(host.innerHTML, '<p><b>h<span class="x">ell</span>o</b></p>');
        equal(getSelection().toString(), 'ell');
    }
));

test('mark command: applying an existing mark is a no-op', () => withMarks(
    '<div contenteditable><p><b class=x>text</b></p></div>', ({commands, host}) => {
        selectContents(host.querySelector('b'));
        equal(commands.run('applyX'), []);
        equal(host.innerHTML, '<p><b class="x">text</b></p>');
    }
));

test('mark command: state distinguishes active, mixed, and inactive selections', () => withMarks(
    '<div contenteditable><p><span class=x>one</span><b class=x>two</b>three<button class=x>atomic</button></p></div>',
    ({commands, host}) => {
        const one = host.querySelector('span').firstChild;
        const two = host.querySelector('b').firstChild;
        const three = host.querySelector('b').nextSibling;
        select(one, 0, two, 3);
        equal(commands.state('toggleX'), true);
        select(three, 0, three, 5);
        equal(commands.state('toggleX'), false);
        select(one, 0, three, 5);
        equal(commands.state('toggleX'), 'mixed');
        selectContents(host.querySelector('button'));
        equal(commands.state('toggleX'), false, 'Atomic content is outside inline mark state');
    }
));

test('mark command: state follows the caret structural context without enabling changes', () => withMarks(
    '<div contenteditable><p><span class=x>one</span>two<b class=x><br></b><button class=x>atomic</button></p></div>',
    ({commands, host}) => {
        const marked = host.querySelector('span');
        const plain = marked.nextSibling;
        const empty = host.querySelector('b');
        const atomic = host.querySelector('button');
        select(marked.firstChild, 1, marked.firstChild, 1);
        equal(commands.state('toggleX'), true);
        equal(commands.enabled('toggleX'), false, 'Pending marks are not implemented yet');
        select(plain, 1, plain, 1);
        equal(commands.state('toggleX'), false);
        select(marked.parentNode, 1, marked.parentNode, 1);
        equal(commands.state('toggleX'), false, 'A boundary outside a marked wrapper stays outside');
        select(empty, 0, empty, 0);
        equal(commands.state('toggleX'), true, 'An empty marked wrapper still provides caret context');
        select(atomic, 0, atomic, 0);
        equal(commands.state('toggleX'), false, 'Atomic content is outside inline mark state');
    }
));

test('mark command: toggle fills a mixed selection and removes an active one', () => withMarks(
    '<div contenteditable><p><span class=x>one</span> two</p></div>', ({commands, host}) => {
        const first = host.querySelector('span').firstChild;
        const last = host.querySelector('p').lastChild;
        select(last, 4, first, 0);
        equal(commands.state('toggleX'), 'mixed');
        commands.run('toggleX');
        equal(host.innerHTML, '<p><span class="x">one two</span></p>');
        equal(commands.state('toggleX'), true);
        truthy(backward(getSelection()));
        commands.run('toggleX');
        equal(host.innerHTML, '<p>one two</p>');
        equal(commands.state('toggleX'), false);
        equal(getSelection().toString(), 'one two');
    }
));

test('mark command: applying merges adjacent canonical wrappers', () => withMarks(
    '<div contenteditable><p><span class=x>first</span><span class=x>second</span></p></div>',
    ({commands, host}) => {
        selectContents(host.firstElementChild);
        commands.run('applyX');
        equal(host.innerHTML, '<p><span class="x">firstsecond</span></p>');
        equal(host.querySelector('span').childNodes.length, 1);
        equal(getSelection().toString(), 'firstsecond');
    }
));

test('mark command: merging stays specific to the adapter canonical wrapper', () => withMarks(
    '<div contenteditable><p><span class="x y">one</span><span class="x y">two</span><b class=x>three</b><b class=x>four</b></p></div>',
    ({commands, host}) => {
        selectContents(host.firstElementChild);
        commands.run('applyX');
        equal(host.innerHTML, '<p><span class="x y">one</span><span class="x y">two</span><b class="x">three</b><b class="x">four</b></p>');
    }
));

test('mark command: removal unwraps only a neutral span', () => withMarks(`
    <div contenteditable><p><span class="x y">one</span><span class=x data-id=1>two</span><b class=x>three</b><span class=x>four</span></p></div>
`, ({commands, host}) => {
        selectContents(host.firstElementChild);
        commands.run('removeX');
        equal(host.innerHTML, '<p><span class="y">one</span><span data-id="1">two</span><b>three</b>four</p>');
        equal(getSelection().toString(), 'onetwothreefour');
    }
));

test('mark command: partial removal isolates the selected marked content', () => withMarks(
    '<div contenteditable><p><span class=x>hello</span></p></div>', ({commands, host}) => {
        const text = host.querySelector('span').firstChild;
        select(text, 1, text, 4);
        commands.run('removeX');
        equal(host.innerHTML, '<p><span class="x">h</span>ell<span class="x">o</span></p>');
        equal(getSelection().toString(), 'ell');
        same(getSelection().anchorNode, host.firstElementChild.childNodes[1]);
    }
));

test('mark command: apply and removal preserve backward direction', () => withMarks(
    '<div contenteditable><p>hello <b>world</b></p></div>', ({commands, host}) => {
        const first = host.querySelector('p').firstChild;
        const last = host.querySelector('b').firstChild;
        select(last, 5, first, 2);
        commands.run('applyX');
        truthy(getSelection().anchorNode.compareDocumentPosition(getSelection().focusNode) & Node.DOCUMENT_POSITION_PRECEDING);
        equal(getSelection().toString(), 'llo world');
        commands.run('removeX');
        truthy(getSelection().anchorNode.compareDocumentPosition(getSelection().focusNode) & Node.DOCUMENT_POSITION_PRECEDING);
        equal(host.innerHTML, '<p>hello <b>world</b></p>');
    }
));

test('mark command: validates adapters and needs a non-collapsed range', () => withMarks(
    '<div contenteditable>text</div>', ({adapter, commands, host}) => {
        throws(() => applyMark(null), TypeError);
        throws(() => applyMark(adapter, new MarkType('x').create()), TypeError);
        const noClear = new MarkAdapter(new MarkType('bold'), {selector: 'strong', tag: 'strong'});
        throws(() => removeMark(noClear), TypeError);
        throws(() => toggleMark(noClear), TypeError);
        select(host.firstChild, 2, host.firstChild, 2);
        equal(commands.enabled('applyX'), false);
        equal(commands.enabled('removeX'), false);
    }
));

function withMarks(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const type = new MarkType('x');
        const adapter = new MarkAdapter(type, {
            selector: '.x',
            tag: 'span',
            reuse: true,
            write: element => element.classList.add('x'),
            clear: element => element.classList.remove('x'),
        });
        const commands = new Commands(surface, {commands: {
            applyX: applyMark(adapter),
            removeX: removeMark(adapter),
            toggleX: toggleMark(adapter),
        }});
        try {
            return run({adapter, commands, core, host, root, surface, type});
        } finally {
            core.dispose();
        }
    });
}

function select(anchorNode, anchorOffset, focusNode, focusOffset) {
    getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
}

function selectContents(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    selectRange(range);
}

function selectRange(range) {
    getSelection().removeAllRanges();
    getSelection().addRange(range);
}

function backward(selection) {
    return selection.anchorNode === selection.focusNode
        ? selection.anchorOffset > selection.focusOffset
        : !!(selection.anchorNode.compareDocumentPosition(selection.focusNode) & Node.DOCUMENT_POSITION_PRECEDING);
}
