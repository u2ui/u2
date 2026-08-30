import {InputPipeline, inputRange, inputTrigger} from '../input-pipeline.js';
import {Commands} from '../../command/commands.js';
import {deleteBackward, deleteForward} from '../../command/delete.js';
import {enter} from '../../command/enter.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('input pipeline: classifies native input sources', () => {
    equal(inputTrigger('insertText'), 'input');
    equal(inputTrigger('deleteContentBackward'), 'input');
    equal(inputTrigger('insertFromPaste'), 'paste');
    equal(inputTrigger('insertFromPasteAsQuotation'), 'paste');
    equal(inputTrigger('insertFromDrop'), 'drop');
});

test('input pipeline: exposes a safe native target-range conversion', () => withPipeline(
    '<div contenteditable><p>text</p></div>', ({document, host, surface}) => {
        const text = host.firstElementChild.firstChild;
        caret(document, text, 1);
        const target = document.createRange();
        target.setStart(text, 2);
        target.setEnd(text, 3);
        const converted = inputRange({getTargetRanges: () => [target]}, surface);
        same(converted.startContainer, text);
        equal(converted.startOffset, 2);
        equal(converted.endOffset, 3);

        const outside = document.createRange();
        outside.selectNodeContents(document.body);
        equal(inputRange({getTargetRanges: () => [outside]}, surface), null);
        equal(inputRange({}, surface).startOffset, 1, 'Missing native targets use the owned selection');
    }
));

test('input pipeline: validates surfaces, models, triggers, and teardown', () => withPipeline(
    '<div contenteditable>text</div>', ({host, pipeline, surface}) => {
        throws(() => new InputPipeline({element: host}), TypeError);
        throws(() => new InputPipeline(surface, {model: {}}), TypeError);
        throws(() => new InputPipeline(surface, {unstyle: {}}), TypeError);
        throws(() => pipeline.normalize('blur'), TypeError);
        pipeline[Symbol.dispose]();
        equal(pipeline.connected, false);
        pipeline.dispose();
        pipeline.dispose();
        throws(() => pipeline.normalize(), DOMException);
    }
));

test('input pipeline: ordinary input normalizes the affected invalid block and preserves selection', () => withPipeline(
    '<div contenteditable style="--u2-rte-clean-on: input"><p id=paragraph></p><p>untouched</p></div>',
    ({document, host}) => {
        const paragraph = host.firstElementChild;
        const block = document.createElement('div');
        block.textContent = 'test';
        paragraph.append(block, ' after');
        select(document, block.firstChild, 1, 3);
        host.dispatchEvent(input(document, 'insertText'));
        equal(paragraph.innerHTML, 'test<br> after');
        equal(host.lastElementChild.outerHTML, '<p>untouched</p>');
        equal(document.getSelection().toString(), 'es');
    }
));

test('input pipeline: CSS element policy drives post-input cleanup', () => withPipeline(
    '<div contenteditable style="--u2-rte-clean-on:input; --u2-rte-elements:p strong br"><h2>Title</h2></div>',
    ({document, host}) => {
        caret(document, host.firstElementChild.firstChild, 3);
        host.dispatchEvent(input(document, 'insertText'));
        equal(host.innerHTML, '<p>Title</p>');
        same(document.getSelection().anchorNode, host.firstElementChild.firstChild);
        equal(document.getSelection().anchorOffset, 3);
    }
));

test('input pipeline: a collapsed caret survives a repair inserted at its own boundary', () => withPipeline(
    '<div contenteditable style="--u2-rte-clean-on: input"><p id=paragraph>x</p></div>',
    ({document, host}) => {
        const paragraph = host.firstElementChild;
        const block = document.createElement('div');
        block.textContent = 'test';
        paragraph.append(block);
        const caret = document.createRange();
        caret.setStart(paragraph, 1);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(caret);
        host.dispatchEvent(input(document, 'insertText'));
        equal(paragraph.innerHTML, 'x<br>test');
        const selection = document.getSelection();
        truthy(selection.isCollapsed, 'The caret did not stay collapsed');
        same(selection.anchorNode, paragraph, 'The caret left its repaired block');
        equal(selection.anchorOffset, 2);
    }
));

test('input pipeline: beforeinput target ranges choose a local scope independently of selection', () => withPipeline(
    '<div contenteditable style="--u2-rte-clean-on: input"><p id=one></p><p id=two></p></div>',
    ({document, host}) => {
        for (const paragraph of host.children) {
            const block = document.createElement('div');
            block.textContent = paragraph.id;
            paragraph.append(block);
        }
        const target = document.createRange();
        target.selectNodeContents(host.firstElementChild.firstElementChild);
        host.dispatchEvent(input(document, 'insertText', 'beforeinput', target));
        host.dispatchEvent(input(document, 'insertText'));
        equal(host.firstElementChild.innerHTML, 'one');
        equal(host.lastElementChild.innerHTML, '<div>two</div>');
    }
));

test('input pipeline: CSS triggers distinguish typing, paste, and drop', () => withPipeline(
    '<div contenteditable style="--u2-rte-clean-on: paste drop"><div>one</div></div>',
    ({document, host}) => {
        host.dispatchEvent(input(document, 'insertText'));
        equal(host.innerHTML, '<div>one</div>');
        host.dispatchEvent(input(document, 'insertFromPaste'));
        equal(host.innerHTML, '<p>one</p>');
        host.innerHTML = '<div>two</div>';
        host.dispatchEvent(input(document, 'insertFromDrop'));
        equal(host.innerHTML, '<p>two</p>');
    }
));

test('input pipeline: native paste unstyles only added content before structural cleanup', () => withPipeline(
    '<div contenteditable><p><strong class=kept style="color:red">before</strong><em class=kept style="color:blue">after</em></p></div>',
    ({document, host}) => {
        const paragraph = host.firstElementChild;
        const existing = paragraph.lastElementChild;
        const target = document.createRange();
        target.setStart(paragraph, 1);
        host.dispatchEvent(input(document, 'insertFromPaste', 'beforeinput', target));

        const block = document.createElement('div');
        block.className = 'foreign';
        block.style.marginLeft = '40px';
        const span = document.createElement('span');
        span.className = 'office';
        span.style.fontFamily = 'serif';
        span.textContent = 'paste';
        block.append(span, existing);
        paragraph.append(block);
        caret(document, span.firstChild, 5);
        host.dispatchEvent(input(document, 'insertFromPaste'));

        equal(host.innerHTML, '<p><strong class="kept" style="color:red">before</strong><br>paste<em class="kept" style="color:blue">after</em></p>');
        same(document.getSelection().anchorNode, paragraph.childNodes[2]);
        equal(document.getSelection().anchorOffset, 5);
    }
));

test('input pipeline: native import cleanup may be disabled per surface', () => withPipeline(
    '<div contenteditable style="--u2-rte-import-unstyle:none"><p>before</p></div>',
    ({document, host}) => {
        const paragraph = host.firstElementChild;
        host.dispatchEvent(input(document, 'insertFromDrop', 'beforeinput'));
        const span = document.createElement('span');
        span.className = 'kept';
        span.style.color = 'red';
        span.textContent = 'drop';
        paragraph.append(span);
        caret(document, span.firstChild, 4);
        host.dispatchEvent(input(document, 'insertFromDrop'));
        equal(host.innerHTML, '<p>before<span class="kept" style="color: red;">drop</span></p>');
    }
));

test('input pipeline: paste and drop sources classify only their immediate native input', () => withPipeline(
    '<div contenteditable style="--u2-rte-clean-on: paste"><div>text</div></div>',
    async ({document, host}) => {
        host.dispatchEvent(new document.defaultView.Event('paste', {bubbles: true}));
        await Promise.resolve();
        host.dispatchEvent(input(document, ''));
        equal(host.innerHTML, '<div>text</div>');
        host.dispatchEvent(new document.defaultView.Event('paste', {bubbles: true}));
        host.dispatchEvent(input(document, ''));
        equal(host.innerHTML, '<p>text</p>');
    }
));

test('input pipeline: composition cleanup is deferred and runs once', () => withPipeline(
    '<div contenteditable><div>text</div></div>', async ({document, host, pipeline}) => {
        let normalized = 0;
        host.addEventListener('u2-rte-normalize', () => normalized++);
        host.dispatchEvent(new document.defaultView.CompositionEvent('compositionstart', {bubbles: true}));
        truthy(pipeline.composing);
        host.dispatchEvent(input(document, 'insertCompositionText', 'input', null, true));
        equal(host.innerHTML, '<div>text</div>');
        host.dispatchEvent(new document.defaultView.CompositionEvent('compositionend', {bubbles: true}));
        await Promise.resolve();
        equal(host.innerHTML, '<p>text</p>');
        equal(normalized, 1);
        equal(pipeline.composing, false);
    }
));

test('input pipeline: a final post-composition input consumes deferred cleanup', () => withPipeline(
    '<div contenteditable><div>text</div></div>', async ({document, host}) => {
        let normalized = 0;
        host.addEventListener('u2-rte-normalize', () => normalized++);
        host.dispatchEvent(new document.defaultView.CompositionEvent('compositionstart', {bubbles: true}));
        host.dispatchEvent(input(document, 'insertCompositionText', 'input', null, true));
        host.dispatchEvent(new document.defaultView.CompositionEvent('compositionend', {bubbles: true}));
        host.dispatchEvent(input(document, 'insertText'));
        await Promise.resolve();
        equal(normalized, 1);
    }
));

test('input pipeline: nested editable input remains isolated', () => withPipeline(
    '<div contenteditable><div contenteditable><div>nested</div></div><div>outer</div></div>',
    ({document, host}) => {
        const nested = host.firstElementChild;
        nested.dispatchEvent(input(document, 'insertText'));
        equal(nested.innerHTML, '<div>nested</div>');
        equal(host.lastElementChild.outerHTML, '<div>outer</div>');
    }
));

test('input pipeline: explicit command cleanup carries transaction metadata', () => withPipeline(
    '<div contenteditable style="--u2-rte-clean-on: command"><div>text</div></div>',
    ({host, pipeline}) => {
        let transaction;
        host.addEventListener('u2-rte-change', event => transaction = event.detail.transaction);
        const result = pipeline.normalize('command', {inputType: 'formatBlock'});
        truthy(result.stable);
        equal(host.innerHTML, '<p>text</p>');
        equal(transaction.options.trigger, 'command');
        equal(transaction.options.inputType, 'formatBlock');
        same(transaction.dirty[0], host);
    }
));

test('input pipeline: view commands do not trigger structural cleanup', () => withPipeline(
    '<div contenteditable style="--u2-rte-clean-on:command"><div>text</div></div>',
    ({document, host, commands}) => {
        let changes = 0;
        host.addEventListener('u2-rte-change', () => changes++);
        caret(document, host.firstElementChild.firstChild, 2);
        equal(commands.run('view'), 'shown');
        equal(host.innerHTML, '<div>text</div>');
        equal(changes, 0);
    }, {view: {transaction: false, run: () => 'shown'}}
));

test('input pipeline: a routed input type is prevented and replaced by its command', () => withPipeline(
    '<div contenteditable style="--u2-rte-clean-on: input command"><p>onetwo</p></div>',
    ({document, host}) => {
        const changes = [];
        const cleanups = [];
        const order = [];
        for (const type of ['u2-rte-command', 'u2-rte-normalize', 'u2-rte-change']) {
            host.addEventListener(type, event => order.push(event.type));
        }
        host.addEventListener('u2-rte-change', event => changes.push(event.detail.transaction));
        host.addEventListener('u2-rte-normalize', event => cleanups.push(event.detail.trigger));
        caret(document, host.firstElementChild.firstChild, 3);
        const event = input(document, 'insertParagraph', 'beforeinput');
        host.dispatchEvent(event);
        truthy(event.defaultPrevented, 'The native paragraph split was not prevented');
        equal(host.innerHTML, '<p>one</p><p>two</p>');
        equal(document.getSelection().anchorOffset, 0);
        same(document.getSelection().anchorNode, host.lastElementChild.firstChild);
        equal(cleanups, ['command']);
        equal(changes.length, 1, 'A command and its cleanup share one transaction');
        equal(order, ['u2-rte-command', 'u2-rte-normalize', 'u2-rte-change'], 'Observers see cause before effect');
    }, {enter}
));

test('input pipeline: structural deletion keys route before unreliable native input', () => withPipeline(
    '<div contenteditable><ul id=back><li><br></li><li><br></li></ul><ul id=forward><li><br></li><li><br></li></ul></div>',
    ({document, host}) => {
        const back = host.querySelector('#back');
        caret(document, back.lastElementChild, 1);
        const event = key(document, 'Backspace');
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(back.innerHTML, '<li><br></li>');
        same(document.getSelection().anchorNode, back.firstElementChild);
        equal(document.getSelection().anchorOffset, 0);

        const native = key(document, 'Backspace');
        host.dispatchEvent(native);
        equal(native.defaultPrevented, false, 'Backspace without a structural command stays native');

        const forward = host.querySelector('#forward');
        caret(document, forward.firstElementChild, 0);
        const deletion = key(document, 'Delete');
        host.dispatchEvent(deletion);
        truthy(deletion.defaultPrevented);
        equal(forward.innerHTML, '<li><br></li>');
    }, {deleteBackward, deleteForward}
));

test('input pipeline: routed commands receive native text data unchanged', () => {
    let received = null;
    const insertText = {
        inputTypes: ['insertText'],
        run(edit) { received = edit.data; },
    };
    return withPipeline('<div contenteditable><p>text</p></div>', ({document, host}) => {
        caret(document, host.querySelector('p').firstChild, 2);
        const event = input(document, 'insertText', 'beforeinput', null, false, 'ä');
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(received, 'ä');
    }, {insertText});
});

test('input pipeline: unknown input types and uncancelable events stay native', () => withPipeline(
    '<div contenteditable><p>onetwo</p></div>', ({document, host}) => {
        caret(document, host.firstElementChild.firstChild, 3);
        const unknown = input(document, 'insertText', 'beforeinput');
        host.dispatchEvent(unknown);
        equal(unknown.defaultPrevented, false, 'Only registered input types are replaced');
        const uncancelable = new document.defaultView.InputEvent('beforeinput', {bubbles: true, inputType: 'insertParagraph'});
        host.dispatchEvent(uncancelable);
        equal(host.innerHTML, '<p>onetwo</p>', 'An event that cannot be prevented must stay native');
    }, {enter}
));

test('input pipeline: an already prevented event is never routed again', () => withPipeline(
    '<div contenteditable><p>onetwo</p></div>', ({document, host}) => {
        caret(document, host.firstElementChild.firstChild, 3);
        const event = input(document, 'insertParagraph', 'beforeinput');
        event.preventDefault();
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(host.innerHTML, '<p>onetwo</p>');
    }, {enter}
));

test('input pipeline: without a command registry every input stays native', () => withPipeline(
    '<div contenteditable><p>onetwo</p></div>', ({document, host}) => {
        caret(document, host.firstElementChild.firstChild, 3);
        const event = input(document, 'insertParagraph', 'beforeinput');
        host.dispatchEvent(event);
        equal(event.defaultPrevented, false);
        equal(host.innerHTML, '<p>onetwo</p>');
    }
));

test('input pipeline: unavailable commands and plain-text hosts keep native behavior', () => withPipeline(
    '<div contenteditable=plaintext-only><p>onetwo</p></div>', ({document, host}) => {
        caret(document, host.firstElementChild.firstChild, 3);
        const plain = input(document, 'insertParagraph', 'beforeinput');
        host.dispatchEvent(plain);
        equal(plain.defaultPrevented, false, 'Plain-text hosts keep the browser behavior');
        equal(host.innerHTML, '<p>onetwo</p>');
    }, {enter}
));

test('input pipeline: a selection is left to native deletion instead of a command', () => withPipeline(
    '<div contenteditable><p>onetwo</p></div>', ({document, host}) => {
        const text = host.firstElementChild.firstChild;
        document.getSelection().setBaseAndExtent(text, 1, text, 4);
        const event = input(document, 'insertParagraph', 'beforeinput');
        host.dispatchEvent(event);
        equal(event.defaultPrevented, false);
        equal(host.innerHTML, '<p>onetwo</p>');
    }, {enter}
));

test('input pipeline: composition is never interrupted by a command', () => withPipeline(
    '<div contenteditable><p>onetwo</p></div>', ({document, host}) => {
        caret(document, host.firstElementChild.firstChild, 3);
        host.dispatchEvent(new document.defaultView.CompositionEvent('compositionstart', {bubbles: true}));
        const event = input(document, 'insertParagraph', 'beforeinput');
        host.dispatchEvent(event);
        equal(event.defaultPrevented, false);
        equal(host.innerHTML, '<p>onetwo</p>');
        host.dispatchEvent(new document.defaultView.CompositionEvent('compositionend', {bubbles: true}));
    }, {enter}
));

test('input pipeline: disposal removes all native event behavior', () => withPipeline(
    '<div contenteditable><div>text</div></div>', ({document, host, pipeline}) => {
        pipeline.dispose();
        host.dispatchEvent(input(document, 'insertText'));
        equal(host.innerHTML, '<div>text</div>');
    }
));

test('input pipeline: surface disconnection tears the module down', () => withPipeline(
    '<div contenteditable><div>text</div></div>', ({host, core, surface, pipeline}) => {
        truthy(core.delete(surface));
        equal(pipeline.connected, false);
        equal(host.innerHTML, '<div>text</div>');
    }
));

function withPipeline(html, run, commands = null) {
    return withFixture(html, async root => {
        const host = root.firstElementChild;
        const core = new Rte(document, {auto: false});
        const surface = core.add(host);
        const registry = commands && new Commands(surface, {commands});
        const pipeline = new InputPipeline(surface, {commands: registry || null});
        try {
            return await run({document, host, core, surface, pipeline, commands: registry});
        } finally {
            pipeline.dispose();
            core.dispose();
        }
    });
}

function caret(document, node, offset) {
    const range = document.createRange();
    range.setStart(node, offset);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
}

function input(document, inputType, type = 'input', range = null, isComposing = false, data = null) {
    const event = new document.defaultView.InputEvent(type, {
        bubbles: true,
        cancelable: type === 'beforeinput',
        inputType,
        isComposing,
        data,
    });
    if (range) Object.defineProperty(event, 'getTargetRanges', {value: () => [range]});
    return event;
}

function key(document, value) {
    return new document.defaultView.KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: value});
}

function select(document, node, start, end) {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
}

test('input pipeline: a command shortcut runs whether or not a control exists', () => withPipeline(
    '<div contenteditable><p>one two</p></div>', ({host, commands, surface}) => {
        let runs = 0;
        commands.add('mark', {shortcut: 'ctrl+shift+x', run() { runs++; }});
        const text = host.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 3);
        surface.capture();
        const event = new KeyboardEvent('keydown', {
            bubbles: true, cancelable: true, ctrlKey: true, shiftKey: true, key: 'X',
        });
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(runs, 1);
    },
    {}
));

test('input pipeline: an unavailable shortcut leaves the key its native meaning', () => withPipeline(
    '<div contenteditable><p>one two</p></div>', ({host, commands, surface}) => {
        let runs = 0;
        commands.add('nest', {shortcut: 'tab', enabled: () => false, run() { runs++; }});
        const text = host.querySelector('p').firstChild;
        getSelection().collapse(text, 1);
        surface.capture();
        const event = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'Tab'});
        host.dispatchEvent(event);
        equal(event.defaultPrevented, false, 'Tab still moves focus outside a list');
        equal(runs, 0);
    },
    {}
));
