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

test('input pipeline: list items and table cells keep direct text unwrapped', () => withFixture(`
    <ul><li contenteditable>item</li></ul>
    <table><tbody><tr><td contenteditable>cell</td></tr></tbody></table>
`, root => {
    const core = new Rte(document, {auto: false});
    const hosts = [root.querySelector('li'), root.querySelector('td')];
    const pipelines = hosts.map(host => new InputPipeline(core.add(host)));
    try {
        for (const pipeline of pipelines) pipeline.normalize('command');
        equal(hosts[0].innerHTML, 'item');
        equal(hosts[1].innerHTML, 'cell');
    } finally {
        for (const pipeline of pipelines) pipeline.dispose();
        core.dispose();
    }
}));

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

// A word processor puts its stylesheet in the clipboard html, and the browser inserts it. Unwrapping
// would leave the css standing in the text, so the element goes with its content.
test('input pipeline: a native paste drops what carries no content', () => withPipeline(
    '<div contenteditable><p>before</p></div>',
    ({document, host}) => {
        const paragraph = host.firstElementChild;
        host.dispatchEvent(input(document, 'insertFromPaste', 'beforeinput'));
        const style = document.createElement('style');
        style.textContent = 'p { line-height: 115% }';
        const text = document.createTextNode('pasted');
        paragraph.append(style, text);
        caret(document, text, 6);
        host.dispatchEvent(input(document, 'insertFromPaste'));
        equal(host.innerHTML, '<p>beforepasted</p>');
    }
));

test('input pipeline: native import cleanup may be disabled per surface', () => withPipeline(
    '<div contenteditable style="--u2-rte-import-unstyle:none; --u2-rte-import-sanitize:none"><p>before</p></div>',
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

// An atomic element is addressable only as the selection: engines disagree about
// whether pointing at one selects it, and a caret one leaves inside it reaches
// nothing at all.
test('pipeline: a click selects the atomic element it landed on', () => withPipeline(
    '<div contenteditable><p>one</p><hr><p>two</p></div>', ({host, surface}) => {
        const rule = host.querySelector('hr');
        const tap = target => target.dispatchEvent(new MouseEvent('click', {bubbles: true, composed: true}));
        tap(rule);
        const range = getSelection().getRangeAt(0);
        same(range.startContainer, host);
        equal(range.startOffset, 0 + [...host.childNodes].indexOf(rule));
        equal(range.endOffset, range.startOffset + 1, 'The element itself, and nothing else');
        same(surface.selection?.range().startContainer, host, 'And the surface has it');

        caret(document, host.firstElementChild.firstChild, 1);
        tap(host.firstElementChild);
        equal(getSelection().getRangeAt(0).collapsed, true, 'A paragraph is not a thing to select');
        tap(host);
        equal(getSelection().getRangeAt(0).collapsed, true, 'Neither is the host itself');
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

// The caret ends up after pasted content, so a caret-derived scope repairs only
// its last block and leaves a pasted document untouched.
test('input pipeline: paste cleanup covers what arrived, not where the caret landed', () => withPipeline(
    '<div contenteditable><p>start</p></div>', async ({document: owner, host}) => {
        const first = host.firstElementChild;
        caret(owner, first.firstChild, 5);
        host.dispatchEvent(new owner.defaultView.InputEvent('beforeinput', {
            bubbles: true, cancelable: true, inputType: 'insertFromPaste',
        }));
        first.insertAdjacentHTML('afterend',
            '<div><div><h2>Title</h2></div></div><div id=keep><div><p>Body</p></div></div>');
        caret(owner, host.lastElementChild, 0);
        host.dispatchEvent(new owner.defaultView.InputEvent('input', {
            bubbles: true, inputType: 'insertFromPaste',
        }));
        await new Promise(resolve => setTimeout(resolve));
        // The wrapper's id does not survive the attribute policy, so nothing
        // marks it as deliberate any more and it dissolves like the rest.
        equal(host.innerHTML, '<p>start</p><h2>Title</h2><p>Body</p>');
    }
));

// A native paste is the one import the browser inserts itself, so it never met
// the attribute policy that every parsed import goes through.
test('input pipeline: pasted content is narrowed to the allowed attributes', () => withPipeline(
    '<div contenteditable><p>start</p></div>', async ({document: owner, host}) => {
        const first = host.firstElementChild;
        caret(owner, first.firstChild, 5);
        host.dispatchEvent(new owner.defaultView.InputEvent('beforeinput', {
            bubbles: true, cancelable: true, inputType: 'insertFromPaste',
        }));
        first.insertAdjacentHTML('afterend',
            '<h2 id=title data-tracked=1 style="color:red" lang=de title=keep>Title</h2>'
            + '<p><a href="/x" id=anchor target=_blank>link</a></p>');
        caret(owner, host.lastElementChild, 0);
        host.dispatchEvent(new owner.defaultView.InputEvent('input', {
            bubbles: true, inputType: 'insertFromPaste',
        }));
        await new Promise(resolve => setTimeout(resolve));
        equal(host.innerHTML, '<p>start</p><h2 lang="de" title="keep">Title</h2>'
            + '<p><a href="/x" target="_blank">link</a></p>');
    }
));

test('input pipeline: a host may keep the attributes the browser pasted', () => withPipeline(
    '<div contenteditable style="--u2-rte-import-sanitize:none"><p>start</p></div>',
    async ({document: owner, host}) => {
        const first = host.firstElementChild;
        caret(owner, first.firstChild, 5);
        host.dispatchEvent(new owner.defaultView.InputEvent('beforeinput', {
            bubbles: true, cancelable: true, inputType: 'insertFromPaste',
        }));
        first.insertAdjacentHTML('afterend', '<h2 id=title>Title</h2>');
        caret(owner, host.lastElementChild, 0);
        host.dispatchEvent(new owner.defaultView.InputEvent('input', {
            bubbles: true, inputType: 'insertFromPaste',
        }));
        await new Promise(resolve => setTimeout(resolve));
        equal(host.innerHTML, '<p>start</p><h2 id="title">Title</h2>');
    }
));

// What may arrive is a narrower question than what a host tolerates in content
// it already owns, so the import policy is its own list with a strict default.
test('input pipeline: pasted markup is reduced to the importable elements', () => withPipeline(
    '<div contenteditable><p>start</p></div>', async ({document: owner, host}) => {
        await paste(owner, host, '<nav><ul><li><a href="/a">Link</a></li></ul></nav>'
            + '<section><h2>Title</h2><p>Text <strong>bold</strong> <span>plain</span><span></span></p>'
            + '<iframe src="/x"></iframe><form><input></form></section>');
        equal(host.innerHTML, '<p>start</p><ul><li><a href="/a">Link</a></li></ul>'
            + '<h2>Title</h2><p>Text <strong>bold</strong> <span>plain</span></p>');
    }
));

test('input pipeline: a host may widen or disable the import policy', () => withPipeline(
    '<div contenteditable style="--u2-rte-import-elements:@document"><p>start</p></div>',
    async ({document: owner, host}) => {
        await paste(owner, host, '<figure><img src="/i.png" alt="i"><figcaption>Cap</figcaption></figure><nav>x</nav>');
        equal(host.innerHTML, '<p>start</p><figure><img src="/i.png" alt="i"><figcaption>Cap</figcaption></figure><p>x</p>');
    }
));

test('input pipeline: the host element policy still bounds the import policy', () => withPipeline(
    '<div contenteditable style="--u2-rte-elements:p a br; --u2-rte-import-elements:@document"><p>start</p></div>',
    async ({document: owner, host}) => {
        await paste(owner, host, '<h2>Title</h2><p>Text <strong>bold</strong></p>');
        equal(host.innerHTML, '<p>start</p><p>Title</p><p>Text bold</p>');
    }
));

async function paste(owner, host, html) {
    const first = host.firstElementChild;
    caret(owner, first.firstChild, 5);
    host.dispatchEvent(new owner.defaultView.InputEvent('beforeinput', {
        bubbles: true, cancelable: true, inputType: 'insertFromPaste',
    }));
    first.insertAdjacentHTML('afterend', html);
    caret(owner, host.lastElementChild, 0);
    host.dispatchEvent(new owner.defaultView.InputEvent('input', {bubbles: true, inputType: 'insertFromPaste'}));
    await new Promise(resolve => setTimeout(resolve));
}

// A strict list would otherwise turn pasted emphasis into plain text, and
// nothing rewrites `<b>` later: the bold mark recognizes it, but only a mark
// command ever makes an element canonical.
test('input pipeline: an element outside the import list keeps its meaning through an alias', () => withPipeline(
    '<div contenteditable><p>start</p></div>', async ({document: owner, host}) => {
        await paste(owner, host, '<p><b>bold</b> and <i>italic</i> and <font color=red>colour</font></p>');
        equal(host.innerHTML,
            '<p>start</p><p><strong>bold</strong> and <em>italic</em> and colour</p>');
    }
));

test('input pipeline: an alias never widens the list it is aliasing into', () => withPipeline(
    '<div contenteditable style="--u2-rte-import-elements:p br"><p>start</p></div>',
    async ({document: owner, host}) => {
        await paste(owner, host, '<p><b>bold</b></p>');
        equal(host.innerHTML, '<p>start</p><p>bold</p>');
    }
));
