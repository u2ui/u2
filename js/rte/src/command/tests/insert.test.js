import {Commands} from '../commands.js';
import {insertNode} from '../insert.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('insert: validates its factory and input types', () => {
    throws(() => insertNode(), TypeError);
    throws(() => insertNode(document => document.createElement('hr'), 'formatX'), TypeError);
    const command = insertNode(document => document.createElement('hr'), ['insertHorizontalRule']);
    equal(command.inputTypes, ['insertHorizontalRule']);
    truthy(typeof command.run === 'function');
});

test('insert: a block element splits the block that holds the caret', () => withRule(
    '<div contenteditable><p>onetwo</p></div>', ({commands, host}) => {
        const text = host.firstElementChild.firstChild;
        getSelection().collapse(text, 3);
        equal(commands.enabled('rule'), true);
        commands.run('rule');
        equal(host.innerHTML, '<p>one</p><hr><p>two</p>');
        same(getSelection().focusNode, host.lastElementChild.firstChild);
        equal(getSelection().focusOffset, 0);
    }
));

test('insert: an empty half of a split block receives a caret position', () => withRule(
    '<div contenteditable><p>one</p></div>', ({commands, host}) => {
        getSelection().collapse(host.firstElementChild.firstChild, 3);
        commands.run('rule');
        equal(host.innerHTML, '<p>one</p><hr><p><br></p>');
    }
));

test('insert: an inline element stays inside its text block', () => withFixture(
    '<div contenteditable><p>onetwo</p></div>', root => {
        const core = new Rte(document, {auto: false});
        try {
            const surface = core.add(root.firstElementChild);
            const commands = new Commands(surface, {commands: {
                image: insertNode(document => document.createElement('img')),
            }});
            getSelection().collapse(root.querySelector('p').firstChild, 3);
            commands.run('image');
            equal(root.firstElementChild.innerHTML, '<p>one<img>two</p>');
        } finally {
            core.dispose();
        }
    }
));

test('insert: a host that forbids the element keeps the command disabled', () => withRule(
    '<div contenteditable style="--u2-rte-elements: p"><p>one</p></div>', ({commands, host}) => {
        getSelection().collapse(host.firstElementChild.firstChild, 1);
        equal(commands.enabled('rule'), false);
    }
));

test('insert: an inline-only host has nowhere to put a block', () => withRule(
    '<p contenteditable>one</p>', ({commands, host}) => {
        getSelection().collapse(host.firstChild, 1);
        equal(commands.enabled('rule'), false);
    }
));

test('insert: a selection inserts at its start and keeps its content', () => withRule(
    '<div contenteditable><p>onetwo</p><p><img></p></div>', ({commands, host}) => {
        const text = host.firstElementChild.firstChild;
        getSelection().setBaseAndExtent(text, 3, text, 6);
        equal(commands.enabled('rule'), true, 'A toolbar shown only for a selection needs this');
        commands.run('rule');
        equal(host.innerHTML, '<p>one</p><hr><p>two</p><p><img></p>');
    }
));

test('insert: atomic content stays native', () => withRule(
    '<div contenteditable><p>onetwo</p><p><img></p></div>', ({commands, host}) => {
        const image = host.querySelector('img');
        getSelection().collapse(image.parentNode, 0);
        equal(commands.enabled('rule'), true, 'A caret beside atomic content is usable');
        getSelection().collapse(host.lastElementChild, 1);
        commands.run('rule');
        truthy(host.querySelector('hr'));
    }
));

function withRule(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        try {
            const surface = core.add(host);
            const commands = new Commands(surface, {commands: {
                rule: insertNode(document => document.createElement('hr'), ['insertHorizontalRule']),
            }});
            return run({commands, core, host, surface});
        } finally {
            core.dispose();
        }
    });
}
