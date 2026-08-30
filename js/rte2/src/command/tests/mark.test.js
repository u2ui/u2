import {applyMark, removeMark, setMarks, toggleMark} from '../mark.js';
import {Commands} from '../commands.js';
import {MarkAdapter} from '../../mark/dom-adapter.js';
import {MarkType} from '../../mark/mark.js';
import {boldHtml} from '../../mark/standard.js';
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

test('mark command: element policy disables wrappers it cannot create', () => withFixture(
    '<div contenteditable style="--u2-rte-elements:p br"><p>text</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = new Commands(core.add(host), {commands: {bold: toggleMark(boldHtml)}});
        selectContents(host.querySelector('p'));
        equal(commands.enabled('bold'), false);
        equal(commands.run('bold'), undefined);
        equal(host.innerHTML, '<p>text</p>');
        core.dispose();
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
        equal(commands.enabled('toggleX'), false, 'Base mark commands do not own caret input');
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

test('mark command: applying removes redundant nested canonical wrappers', () => withFixture(
    '<div contenteditable><p><strong>one<strong>two</strong>three</strong></p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = new Commands(core.add(host), {commands: {bold: applyMark(boldHtml)}});
        try {
            selectContents(host.firstElementChild);
            commands.run('bold');
            equal(host.innerHTML, '<p><strong>onetwothree</strong></p>');
            equal(host.querySelector('strong').childNodes.length, 1);
            equal(getSelection().toString(), 'onetwothree');
        } finally {
            core.dispose();
        }
    }
));

test('mark command: nested canonicalization stays outside atomic content', () => withFixture(
    '<div contenteditable><p><button><strong><strong>atomic</strong></strong></button><strong><strong>text</strong></strong></p></div>',
    root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = new Commands(core.add(host), {commands: {bold: applyMark(boldHtml)}});
        try {
            selectContents(host.firstElementChild);
            commands.run('bold');
            equal(host.innerHTML, '<p><button><strong><strong>atomic</strong></strong></button><strong>text</strong></p>');
        } finally {
            core.dispose();
        }
    }
));

test('mark set command: canonical order exposes and merges equivalent nested runs', () => withMarkSet(
    '<div contenteditable><p><span data-color=blue><strong>one</strong></span><strong><span data-color=blue>two</span></strong></p></div>',
    ({bold, color, commands, host}) => {
        const first = host.querySelector('span strong').firstChild;
        const last = host.querySelector('strong > span').firstChild;
        select(last, last.length, first, 0);
        commands.run('set', {value: [color.create('blue'), bold.create()]});
        equal(host.innerHTML, '<p><strong><span data-color="blue">onetwo</span></strong></p>');
        equal(getSelection().toString(), 'onetwo');
        truthy(backward(getSelection()));
    }
));

test('mark set command: canonical ordering preserves meaningful wrapper boundaries', () => withMarkSet(
    '<div contenteditable><p><span class=keep data-color=blue><strong>one</strong></span><strong><span data-color=blue>two</span></strong></p></div>',
    ({bold, color, commands, host}) => {
        selectContents(host.firstElementChild);
        commands.run('set', {value: [bold.create(), color.create('blue')]});
        equal(host.innerHTML, '<p><span class="keep" data-color="blue"><strong>one</strong></span><strong><span data-color="blue">two</span></strong></p>');
        equal(getSelection().toString(), 'onetwo');
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

test('mark command: applying a conflicting value replaces only the selected part', () => withFixture(
    '<div contenteditable><p><span data-color=red>hello</span></p></div>', root => {
        const color = new MarkType('color');
        const adapter = colorAdapter(color);
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = new Commands(core.add(host), {commands: {blue: applyMark(adapter, 'blue')}});
        try {
            const text = host.querySelector('span').firstChild;
            select(text, 1, text, 4);
            commands.run('blue');
            equal(host.innerHTML, '<p><span data-color="red">h</span><span data-color="blue">ell</span><span data-color="red">o</span></p>');
            equal(getSelection().toString(), 'ell');
        } finally {
            core.dispose();
        }
    }
));

test('mark set command: replaces the configured set atomically and reports its state', () => withMarkSet(
    '<div contenteditable><p><strong>one <span data-color=red>two</span></strong> plain</p></div>',
    ({bold, color, commands, host}) => {
        const first = host.querySelector('strong').firstChild;
        const last = host.querySelector('p').lastChild;
        select(last, last.length, first, 0);
        equal(commands.state('set'), 'mixed');
        commands.run('set', {value: [color.create('red'), bold.create(), color.create('blue')]});
        equal(host.innerHTML, '<p><strong><span data-color="blue">one two plain</span></strong></p>');
        equal(commands.state('set').map(mark => [mark.type.name, mark.value]), [
            ['bold', true],
            ['color', 'blue'],
        ]);
        truthy(backward(getSelection()));
        commands.run('set', {value: [color.create('blue')]});
        equal(host.innerHTML, '<p><span data-color="blue">one two plain</span></p>');
        commands.run('set', {value: []});
        equal(host.innerHTML, '<p>one two plain</p>');
        equal(commands.state('set'), []);
    }
));

test('mark set command: state follows complete sets at selections and carets', () => withMarkSet(
    '<div contenteditable><p><strong><span data-color=blue>one</span></strong><span data-color=blue>two</span></p></div>',
    ({commands, host}) => {
        const one = host.querySelector('strong span').firstChild;
        const two = host.querySelector('p > span').firstChild;
        select(one, 0, one, 3);
        equal(commands.state('set').map(mark => mark.type.name), ['bold', 'color']);
        select(one, 0, two, 3);
        equal(commands.state('set'), 'mixed');
        select(two, 1, two, 1);
        equal(commands.state('set').map(mark => [mark.type.name, mark.value]), [['color', 'blue']]);
        equal(commands.enabled('set', {value: []}), false, 'A set command does not own caret input');
    }
));

test('mark set command: type exclusions remove conflicting DOM marks', () => withFixture(
    '<div contenteditable><p><strong>text</strong></p></div>', root => {
        const ink = new MarkType('ink', {excludes: ['bold']});
        const adapter = new MarkAdapter(ink, {
            selector: '[data-ink]',
            tag: 'span',
            read: element => element.getAttribute('data-ink'),
            write: (element, value) => element.setAttribute('data-ink', value),
            clear: element => element.removeAttribute('data-ink'),
        });
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = new Commands(core.add(host), {commands: {set: setMarks([boldHtml, adapter])}});
        try {
            selectContents(host.firstElementChild);
            commands.run('set', {value: [boldHtml.type.create(), ink.create('black')]});
            equal(host.innerHTML, '<p><span data-ink="black">text</span></p>');
            equal(commands.state('set').map(mark => mark.type.name), ['ink']);
        } finally {
            core.dispose();
        }
    }
));

test('mark set command: validates its closed adapter universe and target values', () => withFixture(
    '<div contenteditable>text</div>', root => {
        const color = new MarkType('color');
        const adapter = colorAdapter(color);
        const noClear = new MarkAdapter(new MarkType('readonly'), {selector: 'i', tag: 'i'});
        throws(() => setMarks(), TypeError);
        throws(() => setMarks([]), TypeError);
        throws(() => setMarks([null]), TypeError);
        throws(() => setMarks([noClear]), TypeError);
        throws(() => setMarks([adapter, adapter]), RangeError);
        const core = new Rte(document, {auto: false});
        const commands = new Commands(core.add(root.firstElementChild), {commands: {set: setMarks([adapter])}});
        try {
            selectContents(root.firstElementChild);
            equal(commands.enabled('set'), false);
            equal(commands.enabled('set', {value: {}}), false);
            equal(commands.enabled('set', {value: [new MarkType('other').create()]}), false);
        } finally {
            core.dispose();
        }
    }
));

test('mark command: semantic removal unwraps aliases and preserves unrelated attributes', () => withFixture(
    '<div contenteditable><p><strong>one</strong><b class=x data-id=2>two</b></p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const commands = new Commands(surface, {commands: {removeBold: removeMark(boldHtml)}});
        try {
            selectContents(host.firstElementChild);
            commands.run('removeBold');
            equal(host.innerHTML, '<p>one<span class="x" data-id="2">two</span></p>');
            equal(getSelection().toString(), 'onetwo');
        } finally {
            core.dispose();
        }
    }
));

test('mark command: partial semantic removal keeps the unselected aliases', () => withFixture(
    '<div contenteditable><p><b>hello</b></p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const commands = new Commands(surface, {commands: {removeBold: removeMark(boldHtml)}});
        try {
            const text = host.querySelector('b').firstChild;
            select(text, 1, text, 4);
            commands.run('removeBold');
            equal(host.innerHTML, '<p><b>h</b>ell<b>o</b></p>');
            equal(getSelection().toString(), 'ell');
        } finally {
            core.dispose();
        }
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

function withMarkSet(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const bold = boldHtml.type;
        const color = new MarkType('color', {rank: 60});
        const adapter = colorAdapter(color);
        const commands = new Commands(core.add(host), {commands: {set: setMarks([boldHtml, adapter])}});
        try {
            return run({adapter, bold, color, commands, core, host});
        } finally {
            core.dispose();
        }
    });
}

function colorAdapter(type) {
    return new MarkAdapter(type, {
        selector: '[data-color]',
        tag: 'span',
        read: element => element.getAttribute('data-color'),
        write: (element, value) => element.setAttribute('data-color', value),
        clear: element => element.removeAttribute('data-color'),
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
