import {InputPipeline, inputTrigger} from '../input-pipeline.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../tests/harness.js';

test('input pipeline: classifies native input sources', () => {
    equal(inputTrigger('insertText'), 'input');
    equal(inputTrigger('deleteContentBackward'), 'input');
    equal(inputTrigger('insertFromPaste'), 'paste');
    equal(inputTrigger('insertFromPasteAsQuotation'), 'paste');
    equal(inputTrigger('insertFromDrop'), 'drop');
});

test('input pipeline: validates surfaces, models, triggers, and teardown', () => withPipeline(
    '<div contenteditable>text</div>', ({host, pipeline, surface}) => {
        throws(() => new InputPipeline({element: host}), TypeError);
        throws(() => new InputPipeline(surface, {model: {}}), TypeError);
        throws(() => pipeline.normalize('blur'), TypeError);
        pipeline.destroy();
        equal(pipeline.connected, false);
        pipeline.destroy();
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

test('input pipeline: destroy removes all native event behavior', () => withPipeline(
    '<div contenteditable><div>text</div></div>', ({document, host, pipeline}) => {
        pipeline.destroy();
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

function withPipeline(html, run) {
    return withFixture(html, async root => {
        const host = root.firstElementChild;
        const core = new Rte(document, {auto: false});
        const surface = core.add(host);
        const pipeline = new InputPipeline(surface);
        try {
            return await run({document, host, core, surface, pipeline});
        } finally {
            pipeline.destroy();
            core.destroy();
        }
    });
}

function input(document, inputType, type = 'input', range = null, isComposing = false) {
    const event = new document.defaultView.InputEvent(type, {bubbles: true, inputType, isComposing});
    if (range) Object.defineProperty(event, 'getTargetRanges', {value: () => [range]});
    return event;
}

function select(document, node, start, end) {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
}
