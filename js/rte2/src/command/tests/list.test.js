import {Commands} from '../commands.js';
import {Lists} from '../list.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('lists: validate their tag group', () => {
    throws(() => new Lists([]), TypeError);
    throws(() => new Lists('ul'), TypeError);
    throws(() => new Lists(['ul', 'a b']), TypeError);
    const lists = new Lists(['UL', 'ol', 'ul']);
    equal(lists.tags, ['ul', 'ol']);
    throws(() => lists.toggle('dl'), RangeError);
    truthy(lists.indent.inputTypes.includes('formatIndent'));
    truthy(lists.outdent.inputTypes.includes('formatOutdent'));
});

test('lists: one paragraph becomes one item and keeps its caret', () => withLists(
    '<div contenteditable><p>one</p></div>', ({commands, host}) => {
        const text = host.firstElementChild.firstChild;
        getSelection().collapse(text, 2);
        equal(commands.state('bullets'), false);
        commands.run('bullets');
        equal(host.innerHTML, '<ul><li>one</li></ul>');
        same(getSelection().focusNode, text);
        equal(getSelection().focusOffset, 2);
        equal(commands.state('bullets'), true);
    }
));

test('lists: several selected paragraphs become one list', () => withLists(
    '<div contenteditable><p>one</p><p>two</p><p>three</p></div>', ({commands, host}) => {
        const one = host.firstElementChild.firstChild;
        const two = host.children[1].firstChild;
        getSelection().setBaseAndExtent(one, 0, two, 3);
        commands.run('bullets');
        equal(host.innerHTML, '<ul><li>one</li><li>two</li></ul><p>three</p>');
    }
));

test('lists: a backward selection keeps its direction', () => withLists(
    '<div contenteditable><p>one</p><p>two</p></div>', ({commands, host}) => {
        const one = host.firstElementChild.firstChild;
        const two = host.lastElementChild.firstChild;
        getSelection().setBaseAndExtent(two, 3, one, 1);
        commands.run('bullets');
        equal(host.innerHTML, '<ul><li>one</li><li>two</li></ul>');
        equal(getSelection().anchorOffset, 3);
        equal(getSelection().focusOffset, 1);
    }
));

test('lists: a block that is not the host text block keeps its element', () => withLists(
    '<div contenteditable><h2>title</h2></div>', ({commands, host}) => {
        getSelection().collapse(host.firstElementChild.firstChild, 1);
        commands.run('bullets');
        equal(host.innerHTML, '<ul><li><h2>title</h2></li></ul>');
    }
));

test('lists: toggling off lifts items back into text blocks', () => withLists(
    '<div contenteditable><ul><li>one</li><li>two</li></ul></div>', ({commands, host}) => {
        const one = host.querySelector('li').firstChild;
        getSelection().setBaseAndExtent(one, 0, host.querySelectorAll('li')[1].firstChild, 3);
        equal(commands.state('bullets'), true);
        commands.run('bullets');
        equal(host.innerHTML, '<p>one</p><p>two</p>');
        same(getSelection().anchorNode, one);
    }
));

test('lists: lifting one item of several splits the list around it', () => withLists(
    '<div contenteditable><ul><li>one</li><li>two</li><li>three</li></ul></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelectorAll('li')[1].firstChild, 1);
        commands.run('bullets');
        equal(host.innerHTML, '<ul><li>one</li></ul><p>two</p><ul><li>three</li></ul>');
    }
));

test('lists: a lifted item keeps its own blocks', () => withLists(
    '<div contenteditable><ul><li><h2>title</h2></li></ul></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('h2').firstChild, 1);
        commands.run('bullets');
        equal(host.innerHTML, '<h2>title</h2>');
    }
));

test('lists: another kind converts the container instead of nesting', () => withLists(
    '<div contenteditable><ul><li>one</li></ul></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('li').firstChild, 1);
        equal(commands.state('numbers'), false);
        commands.run('numbers');
        equal(host.innerHTML, '<ol><li>one</li></ol>');
        equal(commands.state('bullets'), false);
        equal(commands.state('numbers'), true);
    }
));

test('lists: converting one item of several splits the list', () => withLists(
    '<div contenteditable><ul><li id=a>one</li><li id=b>two</li></ul></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('#b').firstChild, 1);
        commands.run('numbers');
        equal(host.innerHTML, '<ul><li id="a">one</li></ul><ol><li id="b">two</li></ol>');
    }
));

test('lists: a new list joins an adjacent list of its own kind', () => withLists(
    '<div contenteditable><ul><li>one</li></ul><p>two</p><p>three</p></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('p').firstChild, 1);
        commands.run('bullets');
        equal(host.innerHTML, '<ul><li>one</li><li>two</li></ul><p>three</p>');
        getSelection().collapse(host.querySelector('p').firstChild, 1);
        commands.run('bullets');
        equal(host.innerHTML, '<ul><li>one</li><li>two</li><li>three</li></ul>');
    }
));

test('lists: mixed selections report mixed and are still convertible', () => withLists(
    '<div contenteditable><ul><li>one</li></ul><p>two</p></div>', ({commands, host}) => {
        const one = host.querySelector('li').firstChild;
        const two = host.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(one, 0, two, 3);
        equal(commands.state('bullets'), 'mixed');
        equal(commands.enabled('bullets'), true);
        commands.run('bullets');
        equal(host.innerHTML, '<ul><li>one</li><li>two</li></ul>');
    }
));

test('lists: two selected lists are both lifted', () => withLists(
    '<div contenteditable><ul><li>one</li></ul><ul><li>two</li></ul></div>', ({commands, host}) => {
        const one = host.querySelector('li').firstChild;
        const two = host.querySelectorAll('li')[1].firstChild;
        getSelection().setBaseAndExtent(one, 0, two, 3);
        equal(commands.state('bullets'), true);
        commands.run('bullets');
        equal(host.innerHTML, '<p>one</p><p>two</p>');
    }
));

test('lists: indent nests a run under its previous item', () => withLists(
    '<div contenteditable><ul><li>one</li><li>two</li><li>three</li></ul></div>', ({commands, host}) => {
        const items = host.querySelectorAll('li');
        getSelection().setBaseAndExtent(items[1].firstChild, 0, items[2].firstChild, 5);
        equal(commands.enabled('indent'), true);
        commands.run('indent');
        equal(host.innerHTML, '<ul><li>one<ul><li>two</li><li>three</li></ul></li></ul>');
    }
));

test('lists: indent reuses an existing nested list', () => withLists(
    '<div contenteditable><ul><li>one<ul><li>a</li></ul></li><li>two</li></ul></div>', ({commands, host}) => {
        getSelection().collapse(host.firstElementChild.children[1].firstChild, 1);
        commands.run('indent');
        equal(host.innerHTML, '<ul><li>one<ul><li>a</li><li>two</li></ul></li></ul>');
    }
));

test('lists: the first item of a list cannot indent', () => withLists(
    '<div contenteditable><ul><li>one</li></ul></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('li').firstChild, 1);
        equal(commands.enabled('indent'), false);
        equal(commands.enabled('outdent'), true);
    }
));

test('lists: outdent raises a nested item into its owning list', () => withLists(
    '<div contenteditable><ul><li>one<ul><li>a</li><li>b</li></ul></li></ul></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('ul ul li').firstChild, 1);
        commands.run('outdent');
        // The raised item joins its owner's level; its former sibling keeps the
        // level it had.
        equal(host.innerHTML, '<ul><li>one</li><li>a</li><li><ul><li>b</li></ul></li></ul>');
    }
));

test('lists: outdent at the top level lifts out of the list', () => withLists(
    '<div contenteditable><ul><li>one</li></ul></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('li').firstChild, 1);
        commands.run('outdent');
        equal(host.innerHTML, '<p>one</p>');
        equal(commands.enabled('outdent'), false);
    }
));

test('lists: a host that forbids lists keeps its controls disabled', () => withLists(
    '<div contenteditable style="--u2-rte-elements: p"><p>one</p></div>', ({commands, host}) => {
        getSelection().collapse(host.firstElementChild.firstChild, 1);
        equal(commands.enabled('bullets'), false);
        equal(commands.enabled('numbers'), false);
    }
));

test('lists: an empty selection reports no state and no availability', () => withLists(
    '<div contenteditable><p>one</p></div>', ({commands}) => {
        getSelection().removeAllRanges();
        equal(commands.state('bullets'), null);
        equal(commands.enabled('bullets'), false);
        equal(commands.enabled('indent'), false);
    }
));

function withLists(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const lists = new Lists(['ul', 'ol']);
        const surface = core.add(host);
        const commands = new Commands(surface, {commands: {
            bullets: lists.toggle('ul'),
            numbers: lists.toggle('ol'),
            indent: lists.indent,
            outdent: lists.outdent,
        }});
        try {
            return run({commands, core, host, lists, surface});
        } finally {
            core.dispose();
        }
    });
}
