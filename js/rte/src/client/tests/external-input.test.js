import {externalInputs, importLevel} from '../external-input.js';
import {Editor} from '../editor.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('external input client module: installs rich import for current and future surfaces', () => withFixture(`
    <div contenteditable style="--u2-rte-import-unstyle:classes"><p>one</p></div>
    <div contenteditable><p>two</p></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const client = new Editor(core);
    const first = core.add(root.firstElementChild);
    const calls = [];
    const sanitizer = {sanitize(html, options) {
        calls.push({html, options});
        const fragment = options.document.createDocumentFragment();
        const strong = options.document.createElement('strong');
        strong.className = 'foreign';
        strong.style.color = 'red';
        strong.textContent = html;
        fragment.append(strong);
        return fragment;
    }};
    const module = externalInputs({sanitizer});
    client.add(module);
    truthy(client.commands(first).has('insertFragment'));
    const text = first.element.querySelector('p').firstChild;
    getSelection().collapse(text, 1);
    const event = richInput('insertFromPaste', 'x');
    first.element.dispatchEvent(event);
    truthy(event.defaultPrevented);
    equal(first.element.innerHTML, '<p>o<strong>x</strong>ne</p>');
    equal(calls.length, 1);

    const second = core.add(root.lastElementChild);
    truthy(client.commands(second).has('insertFragment'));
    equal(importLevel({surface: second}), 'classes');
    truthy(client.delete(module));
    equal(client.commands(first).has('insertFragment'), false);
    equal(client.commands(second).has('insertFragment'), false);
    const native = richInput('insertFromPaste', 'ignored');
    first.element.dispatchEvent(native);
    equal(native.defaultPrevented, false);
    client.dispose();
    core.dispose();
}));

test('external input client module: policy and identity stay replaceable', () => {
    const sanitizer = {sanitize() {}};
    const module = externalInputs({
        sanitizer,
        unstyle: null,
        name: 'foreign',
        command: 'importHtml',
    });
    equal(module.name, 'foreign');
    equal(Object.keys(module.commands()), ['importHtml']);
    same(module.commands().importHtml.run, module.commands().importHtml.run);
    truthy(Object.isFrozen(module));
    truthy(Object.isFrozen(module.commands()));

    throws(() => externalInputs(), TypeError);
    throws(() => externalInputs({sanitizer: {}}), TypeError);
    throws(() => externalInputs({sanitizer, unstyle: {}}), TypeError);
    throws(() => externalInputs({sanitizer, unstyle: null, through: 'styles'}), TypeError);
    throws(() => externalInputs({sanitizer, through: 2}), TypeError);
    throws(() => externalInputs({sanitizer, name: ''}), TypeError);
    throws(() => externalInputs({sanitizer, command: null}), TypeError);
});

test('external input client module: the CSS resolver preserves custom policy names', () => withFixture(
    '<div contenteditable style="--u2-rte-import-unstyle:custom-level"></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        equal(importLevel({surface}), 'custom-level');
        core.dispose();
    }
));

function richInput(inputType, html) {
    const event = new Event('beforeinput', {bubbles: true, cancelable: true});
    Object.defineProperties(event, {
        inputType: {value: inputType},
        isComposing: {value: false},
        dataTransfer: {value: {
            types: ['text/html'],
            getData(type) { return type === 'text/html' ? html : ''; },
        }},
        getTargetRanges: {value: () => []},
    });
    return event;
}
