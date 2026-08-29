import {Commands} from '../commands.js';
import {PendingMarks} from '../pending-marks.js';
import {InputPipeline} from '../../input/input-pipeline.js';
import {MarkAdapter} from '../../mark/dom-adapter.js';
import {MarkType} from '../../mark/mark.js';
import {Rte} from '../../core/core.js';
import {equal, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('pending marks: toggle at a caret formats the next native text input', () => withPending(
    '<div contenteditable><p>text</p></div>', ({commands, document, host}) => {
        caret(document, host.querySelector('p').firstChild, 2);
        equal(commands.run('toggleX'), true);
        equal(commands.state('toggleX'), true);
        const event = beforeInput(document, 'x');
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(host.innerHTML, '<p>te<span class="x">x</span>xt</p>');
        equal(document.getSelection().isCollapsed, true);
        equal(commands.state('toggleX'), true);
    }
));

test('pending marks: inactive override splits inherited formatting around input', () => withPending(
    '<div contenteditable><p><span class=x>text</span></p></div>', ({commands, document, host}) => {
        caret(document, host.querySelector('span').firstChild, 2);
        equal(commands.state('toggleX'), true);
        equal(commands.run('toggleX'), false);
        const event = beforeInput(document, 'x');
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(host.innerHTML, '<p><span class="x">te</span>x<span class="x">xt</span></p>');
        equal(commands.state('toggleX'), false);
    }
));

test('pending marks: moving the caret invalidates pending input without listeners', () => withPending(
    '<div contenteditable><p>one two</p></div>', ({commands, document, host, surface}) => {
        const text = host.querySelector('p').firstChild;
        caret(document, text, 1);
        commands.run('toggleX');
        caret(document, text, 5);
        surface.capture();
        equal(commands.state('toggleX'), false);
        equal(commands.enabled('insertText', {data: 'x'}), false);
        const event = beforeInput(document, 'x');
        host.dispatchEvent(event);
        equal(event.defaultPrevented, false);
        equal(host.innerHTML, '<p>one two</p>');
    }
));

test('pending marks: toggling twice returns to native input', () => withPending(
    '<div contenteditable><p>text</p></div>', ({commands, document, host}) => {
        caret(document, host.querySelector('p').firstChild, 2);
        equal(commands.run('toggleX'), true);
        equal(commands.run('toggleX'), false);
        equal(commands.enabled('insertText', {data: 'x'}), false);
        const event = beforeInput(document, 'x');
        host.dispatchEvent(event);
        equal(event.defaultPrevented, false);
    }
));

test('pending marks: stay bound to one rich-text surface', () => withFixture(
    '<div contenteditable>one</div><div contenteditable=plaintext-only>two</div>', root => {
        const core = new Rte(document, {auto: false});
        const one = core.add(root.children[0]);
        const two = core.add(root.children[1]);
        const pending = new PendingMarks(one);
        const toggle = pending.toggle(adapter());
        const commands = new Commands(two, {commands: {toggle}});
        caret(document, two.element.firstChild, 1);
        equal(commands.enabled('toggle'), false);
        throws(() => toggle.run({surface: two}), RangeError);
        core.dispose();
    }
));

function withPending(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const pending = new PendingMarks(surface);
        const commands = new Commands(surface, {commands: {
            toggleX: pending.toggle(adapter()),
            insertText: pending.insertText,
        }});
        const pipeline = new InputPipeline(surface, {commands});
        try {
            return run({commands, core, document, host, pending, pipeline, surface});
        } finally {
            pipeline.dispose();
            core.dispose();
        }
    });
}

function adapter() {
    const type = new MarkType('x');
    return new MarkAdapter(type, {
        selector: '.x',
        tag: 'span',
        write: element => element.classList.add('x'),
        clear: element => element.classList.remove('x'),
    });
}

function caret(document, node, offset) {
    document.getSelection().setBaseAndExtent(node, offset, node, offset);
}

function beforeInput(document, data) {
    return new document.defaultView.InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data,
    });
}
