import {ExternalInput} from '../external-input.js';
import {Commands} from '../../command/commands.js';
import {insertFragment} from '../../command/fragment.js';
import {Rte} from '../../core/core.js';
import {defaultUnstyle} from '../../unstyle/unstyle.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('external input: validates its explicit composition and teardown', () => withExternal(
    '<div contenteditable><p>text</p></div>', ({external, surface, commands, sanitizer}) => {
        throws(() => new ExternalInput({}), TypeError);
        throws(() => new ExternalInput(surface, {commands: {}, sanitizer}), TypeError);
        throws(() => new ExternalInput(surface, {commands, sanitizer: {}}), TypeError);
        throws(() => new ExternalInput(surface, {commands, sanitizer, command: 'missing'}), RangeError);
        throws(() => new ExternalInput(surface, {commands, sanitizer, through: 'styles'}), TypeError);
        throws(() => new ExternalInput(surface, {
            commands, sanitizer, unstyle: defaultUnstyle, through: 2,
        }), TypeError);
        external[Symbol.dispose]();
        equal(external.connected, false);
        external.dispose();
        throws(() => external.insert('<p>later</p>'), DOMException);
    }
));

test('external input: sanitizes, optionally unstyles, and inserts rich paste at its target range', () => {
    let options;
    let context;
    const sanitizer = {
        sanitize(html, supplied) {
            options = supplied;
            const fragment = supplied.document.createDocumentFragment();
            const strong = supplied.document.createElement('strong');
            strong.className = 'foreign';
            strong.style.color = 'red';
            strong.textContent = html;
            fragment.append(strong);
            return fragment;
        },
    };
    return withExternal(`
        <div contenteditable style="--u2-rte-elements:p strong"><p>one</p><p>two</p></div>
    `, ({document, external, host}) => {
        const first = host.firstElementChild.firstChild;
        const second = host.lastElementChild.firstChild;
        caret(document, second, 2);
        const target = range(document, first, 1);
        const event = richInput(document, 'insertFromPaste', target, '<b>x</b>');
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(host.innerHTML, '<p>o<strong>&lt;b&gt;x&lt;/b&gt;</strong>ne</p><p>two</p>');
        same(options.document, document);
        equal(options.base, document.baseURI);
        equal(options.elements, ['p', 'strong']);
        equal(context.inputType, 'insertFromPaste');
        same(context.surface, external.surface);
        same(document.getSelection().anchorNode, host.firstElementChild);
        equal(document.getSelection().anchorOffset, 2);
    }, {
        sanitizer,
        unstyle: defaultUnstyle,
        through(value) {
            context = value;
            return 'classes';
        },
    });
});

test('external input: drop replaces the beforeinput target rather than the current selection', () => withExternal(
    '<div contenteditable><p>one</p><p>two</p></div>', ({document, host}) => {
        const first = host.firstElementChild.firstChild;
        const second = host.lastElementChild.firstChild;
        caret(document, first, 0);
        const target = range(document, second, 1, 3);
        const event = richInput(document, 'insertFromDrop', target, 'x');
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(host.innerHTML, '<p>one</p><p>t<em>x</em></p>');
        same(document.getSelection().anchorNode, host.lastElementChild);
        equal(document.getSelection().anchorOffset, 2);
    }
));

test('external input: plain text and input it does not own remain native', () => withExternal(`
    <div contenteditable><p>outer<span contenteditable>inner</span></p></div>
`, ({document, host, calls}) => {
    const plain = richInput(document, 'insertFromPaste', null, null, ['text/plain']);
    host.dispatchEvent(plain);
    equal(plain.defaultPrevented, false);

    const quotation = richInput(document, 'insertFromPasteAsQuotation', null, '<p>quote</p>');
    host.dispatchEvent(quotation);
    equal(quotation.defaultPrevented, false);

    const composing = richInput(document, 'insertFromPaste', null, '<p>ime</p>', ['text/html'], true);
    host.dispatchEvent(composing);
    equal(composing.defaultPrevented, false);

    const nested = host.querySelector('[contenteditable]');
    const isolated = richInput(document, 'insertFromPaste', null, '<p>nested</p>');
    nested.dispatchEvent(isolated);
    equal(isolated.defaultPrevented, false);
    equal(calls.count, 0);
}));

test('external input: a removed or rejected rich fragment fails closed without deleting selection', () => withExternal(
    '<div contenteditable><p>keep</p></div>', ({document, host}) => {
        const text = host.firstElementChild.firstChild;
        select(document, text, 1, 3);
        const event = richInput(document, 'insertFromPaste', null, '<script>bad</script>');
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(host.innerHTML, '<p>keep</p>');
        equal(document.getSelection().toString(), 'ee');
    }, {sanitizer: emptySanitizer}
));

test('external input: sanitizer failures are observable and keep unsafe native insertion prevented', () => {
    const failure = new Error('unsafe input rejected');
    return withExternal('<div contenteditable><p>keep</p></div>', ({document, host}) => {
        let detail;
        host.addEventListener('u2-rte-error', event => detail = event.detail);
        const event = richInput(document, 'insertFromPaste', null, '<img onerror=bad>');
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(host.innerHTML, '<p>keep</p>');
        same(detail.error, failure);
        equal(detail.transaction, null);
        equal(detail.phase, 'external-input');
        equal(detail.inputType, 'insertFromPaste');
    }, {sanitizer: {sanitize() { throw failure; }}});
});

test('external input: payload read failures are also fail-closed', () => {
    const failure = new Error('payload unavailable');
    return withExternal('<div contenteditable><p>keep</p></div>', ({document, host, calls}) => {
        let detail;
        host.addEventListener('u2-rte-error', event => detail = event.detail);
        const event = richInput(document, 'insertFromDrop', null, () => { throw failure; });
        host.dispatchEvent(event);
        truthy(event.defaultPrevented);
        equal(host.innerHTML, '<p>keep</p>');
        same(detail.error, failure);
        equal(detail.phase, 'external-input');
        equal(calls.count, 0);
    });
});

test('external input: direct insertion validates sanitizer output and honors disposal by the surface', () => withExternal(
    '<div contenteditable><p>text</p></div>', ({core, external, host, surface}) => {
        throws(() => external.insert(null), TypeError);
        core.delete(surface);
        equal(external.connected, false);
        const event = richInput(host.ownerDocument, 'insertFromPaste', null, 'ignored');
        host.dispatchEvent(event);
        equal(event.defaultPrevented, false);
    }
));

test('external input: a sanitizer must return a detached DOM fragment', () => withExternal(
    '<div contenteditable><p>text</p></div>', ({external}) => {
        throws(() => external.insert('<p>x</p>'), TypeError);
    }, {sanitizer: {sanitize() { return document.createElement('p'); }}}
));

function withExternal(source, run, options = {}) {
    return withFixture(source, async root => {
        const host = root.firstElementChild;
        const core = new Rte(document, {auto: false});
        const surface = core.add(host);
        const commands = new Commands(surface, {commands: {insertFragment}});
        const calls = {count: 0};
        const sanitizer = options.sanitizer || {
            sanitize(html, {document}) {
                calls.count++;
                const fragment = document.createDocumentFragment();
                const element = document.createElement('em');
                element.textContent = html;
                fragment.append(element);
                return fragment;
            },
        };
        const external = new ExternalInput(surface, {commands, sanitizer, ...options});
        try {
            return await run({document, host, core, surface, commands, sanitizer, external, calls});
        } finally {
            external.dispose();
            core.dispose();
        }
    });
}

const emptySanitizer = {
    sanitize(html, {document}) {
        return document.createDocumentFragment();
    },
};

function richInput(document, inputType, target, html, types = ['text/html'], isComposing = false) {
    const event = new document.defaultView.Event('beforeinput', {bubbles: true, cancelable: true});
    Object.defineProperties(event, {
        inputType: {value: inputType},
        isComposing: {value: isComposing},
        dataTransfer: {value: {
            types,
            getData(type) {
                if (typeof html === 'function') return html(type);
                return type === 'text/html' ? html || '' : '';
            },
        }},
        getTargetRanges: {value: () => target ? [target] : []},
    });
    return event;
}

function range(document, node, start, end = start) {
    const result = document.createRange();
    result.setStart(node, start);
    result.setEnd(node, end);
    return result;
}

function caret(document, node, offset) {
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range(document, node, offset));
}

function select(document, node, start, end) {
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range(document, node, start, end));
}
