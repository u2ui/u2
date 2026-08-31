import {imageTools} from '../images.js';
import {Editor} from '../editor.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

const FIXTURE = '<div contenteditable style="--u2-rte-toolbar:imageOriginal">'
    + '<p>text</p><p><img id=a src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width=200 height=100></p></div>';

test('image frame: appears on a selected image and vanishes otherwise', () => withImages(
    ({host, frame, pick}) => {
        equal(frame(), null, 'Nothing is built before an image is selected');
        pick('#a');
        truthy(frame());
        equal(frame().hidden, false);
        equal([...frame().querySelectorAll('button')].map(handle => handle.dataset.handle),
            ['se', 'e', 's']);
        const paragraph = host.querySelector('p');
        getSelection().collapse(paragraph.firstChild, 2);
        host.dispatchEvent(new Event('input', {bubbles: true}));
        equal(frame().hidden, true);
    }
));

// Engines disagree about whether pointing at an image selects it, and nothing
// is addressable until it is the selection.
test('image frame: clicking an image selects it', () => withImages(({host, frame}) => {
    const image = host.querySelector('#a');
    image.dispatchEvent(new MouseEvent('click', {bubbles: true, composed: true}));
    equal(getSelection().toString(), '');
    same(getSelection().getRangeAt(0).startContainer, image.parentNode);
    equal(frame().hidden, false);
}));

test('image frame: a drag writes the size once when it is released', () => withImages(
    ({client, host, frame, pick, surface}) => {
        const image = host.querySelector('#a');
        pick('#a');
        const history = client.history(surface);
        const entries = history.length;
        const rect = image.getBoundingClientRect();
        const corner = frame().querySelector('[data-handle=se]');
        corner.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerId: 1}));
        dispatchTo(window, 'pointermove', {clientX: rect.left + 100, clientY: rect.top + 50});
        equal(image.getAttribute('width'), '200', 'The drag moves the frame, not the image');
        dispatchTo(window, 'pointerup', {clientX: rect.left + 100, clientY: rect.top + 50});
        equal(image.getAttribute('width'), '100');
        equal(image.getAttribute('height'), '50', 'A corner keeps the proportion');
        equal(history.length, entries + 1, 'A resize is one undo step');
    }
));

test('image frame: an edge changes one measurement alone', () => withImages(
    ({host, frame, pick}) => {
        const image = host.querySelector('#a');
        pick('#a');
        const rect = image.getBoundingClientRect();
        frame().querySelector('[data-handle=e]')
            .dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerId: 1}));
        dispatchTo(window, 'pointerup', {clientX: rect.left + 300, clientY: rect.top + 10});
        equal(image.getAttribute('width'), '300');
        equal(image.getAttribute('height'), '100', 'The height is left where it was');

        pick('#a');
        frame().querySelector('[data-handle=s]')
            .dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerId: 1}));
        dispatchTo(window, 'pointerup', {clientX: rect.left + 10, clientY: rect.top + 40});
        equal(image.getAttribute('width'), '300', 'The width is left where it was');
        equal(image.getAttribute('height'), '40');
    }
));

// The image's top and start edges are held by the flow around it, so only the
// trailing edges can grow it where the eye expects.
test('image frame: every handle sits on a trailing edge', () => withImages(({frame, pick}) => {
    pick('#a');
    equal([...frame().querySelectorAll('button')].map(handle => handle.dataset.handle), ['se', 'e', 's']);
    equal([...frame().querySelectorAll('button')].map(handle => handle.style.cursor),
        ['nwse-resize', 'ew-resize', 'ns-resize']);
}));

test('image frame: pointing at a handle keeps the image selected', () => withImages(({frame, pick}) => {
    pick('#a');
    const event = new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerId: 1});
    frame().querySelector('[data-handle=e]').dispatchEvent(event);
    truthy(event.defaultPrevented);
}));

test('image frame: original size clears what a resize wrote', () => withImages(
    ({client, host, pick, surface}) => {
        const image = host.querySelector('#a');
        pick('#a');
        const commands = client.commands(surface);
        equal(commands.enabled('imageOriginal'), true);
        commands.run('imageOriginal');
        equal(image.outerHTML.includes('width'), false);
        equal(commands.enabled('imageOriginal'), false, 'There is nothing left to clear');
    }
));

test('image frame: the layer is released with the module', () => withImages(({client, pick}) => {
    pick('#a');
    client.delete('images');
    equal(client.chrome.root.getElementById('images'), null);
}));

function dispatchTo(target, type, init) {
    target.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1, ...init}));
}

// What an image says is part of the image, and a form nobody opens is a form
// everybody fills in.
test('image frame: a selected image carries its alt text with it', () => withImages(
    ({client, host, pick}) => {
        const form = () => client.chrome.root.getElementById('image');
        pick('#a');
        const field = form().querySelector('input');
        equal(form().hidden, false);
        equal(field.value, '');
        equal(client.chrome.root.activeElement, null, 'Appearing takes no focus');
        field.value = 'A cat';
        field.dispatchEvent(new Event('input', {bubbles: true}));
        equal(host.querySelector('#a').getAttribute('alt'), 'A cat');
        same(client.chrome.root.activeElement, field, 'Naming the image keeps the keyboard here');
        getSelection().collapse(host.querySelector('p').firstChild, 2);
        host.dispatchEvent(new Event('input', {bubbles: true}));
        equal(form().hidden, true, 'It goes with the frame');
        pick('#a');
        equal(form().querySelector('input').value, 'A cat', 'And comes back with what it says');
    }
));

// What a field draws at its content is the field's decision: the same module set
// serves a body of text and a bare teaser field.
test('image frame: a field can turn the contextual ui off', () => withImages(
    ({host, frame, pick}) => {
        pick('#a');
        truthy(frame(), 'On by default');
        host.style.setProperty('--u2-rte-inline-ui', 'table link');
        pick('p');
        pick('#a');
        equal(frame().hidden, true);
        host.style.setProperty('--u2-rte-inline-ui', 'image');
        pick('p');
        pick('#a');
        equal(frame().hidden, false);
    }
));

function withImages(run) {
    return withFixture(FIXTURE, root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            client.add(imageTools());
            const host = root.firstElementChild;
            const surface = core.add(host);
            const pick = selector => {
                const range = document.createRange();
                range.selectNode(host.querySelector(selector));
                getSelection().removeAllRanges();
                getSelection().addRange(range);
                core.sync();
                surface.capture();
            };
            const frame = () => client.chrome.root.getElementById('images');
            return run({client, core, frame, host, pick, surface});
        } finally {
            client.dispose();
            core.dispose();
        }
    });
}
