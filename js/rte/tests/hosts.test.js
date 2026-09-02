import {Editor} from '../src/client/editor.js';
import {link} from '../link.js';
import {Rte} from '../src/core/core.js';
import {equal, test, withFixture} from './harness.js';

// The host shapes an application actually uses, repaired by the content model
// rather than by a rule per shape: what a host allows is what stays in it.
const repair = (html, edit) => withFixture(html, root => {
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    try {
        const surface = core.add(root.firstElementChild);
        // The caret sits in what was just written: repair follows the input, it
        // does not sweep the whole host.
        const at = edit(surface.element);
        getSelection().collapse(at, at.nodeType === Node.TEXT_NODE ? at.length : 0);
        core.sync();
        surface.element.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText', data: 'x'}));
        return surface.element.innerHTML;
    } finally {
        client.dispose();
        core.dispose();
    }
});

test('hosts: a list host keeps items in it', () => {
    equal(repair('<ul contenteditable><li>one</li></ul>', element => {
        element.append('loose');
        return element.lastChild;
    }), '<li>one</li><li>loose</li>');
});

test('hosts: a block host wraps what it holds', () => {
    equal(repair('<div contenteditable><p>one</p></div>', element => {
        element.append('loose');
        return element.lastChild;
    }), '<p>one</p><p>loose</p>');
});

// A link host is still a link: the content model forbids one inside it, so the
// control that would make one is simply unavailable — no rule of its own needed.
test('hosts: a link host offers no link', () => withFixture(
    '<a href="#a" contenteditable style="--u2-rte-toolbar:link">link host</a>'
    + '<div contenteditable style="--u2-rte-toolbar:link"><p>plain host</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        client.add(link);
        try {
            for (const [element, offered] of [[root.lastElementChild, true], [root.firstElementChild, false]]) {
                const surface = core.add(element);
                const text = element.querySelector('p')?.firstChild || element.firstChild;
                getSelection().setBaseAndExtent(text, 0, text, 4);
                core.sync();
                // With a value, availability is the question the model answers:
                // may a link be made here at all.
                equal(client.commands(surface).enabled('link', {value: {href: '#x'}}), offered,
                    offered ? 'A plain host takes one' : 'A link host does not');
            }
        } finally {
            client.dispose();
            core.dispose();
        }
    }
));

test('hosts: a paragraph inside a paragraph is unwrapped', () => {
    equal(repair('<div contenteditable><p>one</p></div>', element => {
        element.firstElementChild.insertAdjacentHTML('beforeend', '<p>inner</p>');
        return element.querySelector('p p').firstChild;
    }), '<p>one<br>inner</p>');
});
