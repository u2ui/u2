import {Commands} from '../commands.js';
import {insertFragment} from '../fragment.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

test('fragment command: requires a prepared fragment and a useful range', () => withFragments(
    '<div contenteditable><p>text</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().collapse(text, 2);
        equal(commands.enabled('insert'), false);
        equal(commands.enabled('insert', {fragment: document.createDocumentFragment()}), false);
        const fragment = html('<strong>x</strong>');
        truthy(commands.enabled('insert', {fragment}));
        equal(fragment.firstElementChild.localName, 'strong', 'Availability must not consume the fragment');
    }
));

test('fragment command: inserts inline content at a caret and selects its end', () => withFragments(
    '<div contenteditable><p>hello</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().collapse(text, 2);
        const fragment = html('<strong>x</strong>');
        const inserted = commands.run('insert', {fragment});
        equal(host.innerHTML, '<p>he<strong>x</strong>llo</p>');
        equal(fragment.childNodes.length, 0);
        equal(inserted.map(node => node.localName), ['strong']);
        truthy(getSelection().isCollapsed);
        same(getSelection().anchorNode, host.querySelector('p'));
        equal(getSelection().anchorOffset, 2);
    }
));

test('fragment command: replaces a backward partial selection through mapped removals', () => withFragments(
    '<div contenteditable><p>hello</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 4, text, 1);
        commands.run('insert', {fragment: html('<em>x</em>')});
        equal(host.innerHTML, '<p>h<em>x</em>o</p>');
        truthy(getSelection().isCollapsed);
        same(getSelection().anchorNode, host.querySelector('p'));
        equal(getSelection().anchorOffset, 2);
    }
));

test('fragment command: an empty fragment explicitly deletes a selected range', () => withFragments(
    '<div contenteditable><p>hello</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 1, text, 4);
        const result = commands.run('insert', {fragment: document.createDocumentFragment()});
        equal(result, []);
        equal(host.innerHTML, '<p>ho</p>');
        truthy(getSelection().isCollapsed);
    }
));

test('fragment command: block content lifts by splitting only the necessary context', () => withFragments(
    '<div contenteditable><p id=kept>hello</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().collapse(text, 2);
        commands.run('insert', {fragment: html('<p class=external>new</p>')});
        equal(host.innerHTML, '<p id="kept">he</p><p class="external">new</p><p>llo</p>');
        same(getSelection().anchorNode, host);
        equal(getSelection().anchorOffset, 2);
    }
));

test('fragment command: edge insertion does not create an empty split wrapper', () => withFragments(
    '<div contenteditable><p>hello</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().collapse(text, text.length);
        commands.run('insert', {fragment: html('<p>next</p>')});
        equal(host.innerHTML, '<p>hello</p><p>next</p>');
    }
));

test('fragment command: list and link insertion use the same content-model lifting', () => withFragments(
    '<div contenteditable><ul><li>hello</li></ul><p><a href=#old>world</a></p></div>', ({commands, host}) => {
        const item = host.querySelector('li').firstChild;
        getSelection().collapse(item, 2);
        commands.run('insert', {fragment: html('<li>new</li>')});
        equal(host.querySelector('ul').innerHTML, '<li>he</li><li>new</li><li>llo</li>');

        const link = host.querySelector('a').firstChild;
        getSelection().collapse(link, 2);
        commands.run('insert', {fragment: html('<a href="#new">new</a>')});
        equal(host.querySelector('p').innerHTML,
            '<a href="#old">wo</a><a href="#new">new</a><a href="#old">rld</a>');
    }
));

test('fragment command: selected nested editors remain isolation boundaries', () => withFragments(`
    <div contenteditable><p>one<span contenteditable><b>inner</b></span>two</p></div>
`, ({commands, host}) => {
    const paragraph = host.querySelector('p');
    const range = document.createRange();
    range.setStart(paragraph.firstChild, 1);
    range.setEnd(paragraph.lastChild, 2);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    commands.run('insert', {fragment: html('<em>x</em>')});
    equal(host.innerHTML, '<p>o<em>x</em><span contenteditable=""><b>inner</b></span>o</p>');
}));

function withFragments(source, run) {
    return withFixture(source, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const commands = new Commands(surface, {commands: {insert: insertFragment}});
        try {
            return run({commands, core, host, surface});
        } finally {
            core.dispose();
        }
    });
}

function html(source) {
    const template = document.createElement('template');
    template.innerHTML = source; // Trusted test fixture; production accepts only a prepared fragment.
    return template.content;
}
