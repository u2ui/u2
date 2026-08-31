import {BlockStyles} from '../block-style.js';
import {Commands} from '../commands.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

const defaults = [
    {name: 'paragraph', label: 'Paragraph', selector: 'p', tag: 'p'},
    {name: 'h1', label: 'Heading 1', selector: 'h1', tag: 'h1'},
    {name: 'h2', label: 'Heading 2', selector: 'h2', tag: 'h2'},
    {name: 'lead', label: 'Lead', selector: 'p.lead', tag: 'p',
        write: element => element.classList.add('lead'),
        clear: element => element.classList.remove('lead')},
];

test('block styles: validate definitions and expose immutable snapshots', () => {
    throws(() => new BlockStyles(), TypeError);
    throws(() => new BlockStyles([]), TypeError);
    throws(() => new BlockStyles([null]), TypeError);
    throws(() => new BlockStyles([{name: 'p'}]), TypeError);
    throws(() => new BlockStyles([{name: 'p', label: 'P', selector: 'p', tag: 'p q'}]), TypeError);
    throws(() => new BlockStyles([{name: 'p', label: 'P', selector: 'p', tag: 'p', write: true}]), TypeError);
    throws(() => new BlockStyles([
        {name: 'p', label: 'P', selector: 'p', tag: 'p'},
        {name: 'p', label: 'Other', selector: 'div', tag: 'div'},
    ]), RangeError);
    const styles = new BlockStyles(defaults);
    equal(styles.styles.map(style => style.name), ['paragraph', 'h1', 'h2', 'lead']);
    truthy(Object.isFrozen(styles.styles[0]));
    truthy(styles.command());
});

test('block styles: convert one or several text blocks and preserve selection direction', () => withStyles(
    '<div contenteditable><p id=one class=keep>one</p><h2 id=two>two</h2></div>',
    ({commands, host}) => {
        const one = host.querySelector('#one').firstChild;
        const two = host.querySelector('#two').firstChild;
        getSelection().setBaseAndExtent(two, 2, one, 1);
        const changed = commands.run('style', {value: 'h1'});
        equal(host.innerHTML, '<h1 id="one" class="keep">one</h1><h1 id="two">two</h1>');
        equal(changed.map(block => block.localName), ['h1', 'h1']);
        same(getSelection().anchorNode, two);
        equal(getSelection().anchorOffset, 2);
        same(getSelection().focusNode, one);
        equal(getSelection().focusOffset, 1);
    }
));

test('block styles: report one or mixed values without changing DOM', () => withStyles(
    '<div contenteditable><h1>one</h1><p>two</p></div>', ({commands, host}) => {
        const one = host.firstElementChild.firstChild;
        const two = host.lastElementChild.firstChild;
        getSelection().collapse(one, 1);
        equal(commands.state('style'), 'h1');
        getSelection().setBaseAndExtent(one, 0, two, 3);
        equal(commands.state('style'), 'mixed');
        equal(host.innerHTML, '<h1>one</h1><p>two</p>');
    }
));

test('block styles: later custom styles refine a base tag and clear symmetrically', () => withStyles(
    '<div contenteditable><p class="lead keep">text</p></div>', ({commands, host}) => {
        const text = host.firstElementChild.firstChild;
        getSelection().collapse(text, 2);
        equal(commands.state('style'), 'lead');
        commands.run('style', {value: 'h2'});
        equal(host.innerHTML, '<h2 class="keep">text</h2>');
        commands.run('style', {value: 'lead'});
        equal(host.innerHTML, '<p class="keep lead">text</p>');
    }
));

test('block styles: reject invalid targets and ignore non-style blocks', () => withFixture(
    '<div contenteditable><div><p>text</p></div><p class=invalid>bad</p><ul><li>item</li></ul></div>', root => {
        const host = root.firstElementChild;
        const core = new Rte(document, {auto: false});
        const surface = core.add(host);
        const styles = new BlockStyles([...defaults, {
            name: 'item', label: 'Invalid item', selector: 'p.invalid', tag: 'li',
        }]);
        const commands = registry(surface, styles);
        getSelection().collapse(host.querySelector('p').firstChild, 1);
        truthy(commands.enabled('style', {value: 'h1'}));
        equal(commands.enabled('style', {value: 'missing'}), false);
        getSelection().collapse(host.querySelector('.invalid').firstChild, 1);
        equal(commands.enabled('style', {value: 'item'}), false);
        getSelection().collapse(host.querySelector('li').firstChild, 1);
        equal(commands.enabled('style', {value: 'h1'}), false);
        equal(commands.state('style'), null);
        core.dispose();
    }
));

function withStyles(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const styles = new BlockStyles(defaults);
        const commands = registry(surface, styles);
        try {
            return run({commands, core, host, styles, surface});
        } finally {
            core.dispose();
        }
    });
}

function registry(surface, styles) {
    return new Commands(surface, {commands: {style: styles.command()}});
}
