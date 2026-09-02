import {Chrome} from '../chrome.js';
import {Handles} from '../handles.js';
import {equal, same, test, throws, truthy} from '../../../tests/harness.js';

const DESCRIPTORS = [
    {name: 'rowAfter', label: 'Row below', text: '+'},
    {name: 'rowRemove', label: 'Remove row', text: '×', cursor: 'pointer'},
];

test('handles: validate their root and descriptors', () => {
    throws(() => new Handles(null, {handles: DESCRIPTORS}), TypeError);
    throws(() => new Handles(document, {handles: []}), TypeError);
    throws(() => new Handles(document, {handles: [{label: 'No name'}]}), TypeError);
    throws(() => new Handles(document, {handles: DESCRIPTORS, action: 'run'}), TypeError);
    throws(() => new Handles(document, {handles: DESCRIPTORS, press: 'run'}), TypeError);
});

test('handles: a shadow root holds them, and one stylesheet serves all of them', () => {
    const chrome = new Chrome(document, {name: 'test'});
    const first = new Handles(chrome.root, {name: 'one', handles: DESCRIPTORS});
    const second = new Handles(chrome.root, {name: 'two', handles: DESCRIPTORS});
    try {
        same(chrome.root.getElementById('one'), first.element);
        same(chrome.root.getElementById('two'), second.element);
        equal(chrome.root.querySelectorAll('#handles-style').length, 1, 'One set of rules for every set');
        equal(first.names, ['rowAfter', 'rowRemove']);
        equal(first.visible, false, 'Nothing is drawn before it is placed');
        const button = first.button('rowAfter');
        equal(button.title, 'Row below');
        equal(button.getAttribute('aria-label'), 'Row below');
        equal(button.tabIndex, -1, 'Chrome is pointed at, not tabbed to');
        equal(first.button('rowRemove').style.cursor, 'pointer');
        equal(first.button('nothing'), null);
    } finally {
        first.dispose();
        second.dispose();
        chrome.dispose();
    }
});

test('handles: showing, placing, disabling and framing', () => {
    const chrome = new Chrome(document, {name: 'test'});
    const handles = new Handles(chrome.root, {handles: DESCRIPTORS});
    try {
        same(handles.show(), handles, 'Every setting chains');
        equal(handles.visible, true);
        handles.place('rowAfter', 100, 50);
        const button = handles.button('rowAfter');
        const size = button.offsetWidth || 20;
        equal(button.style.left, `${100 - size / 2}px`, 'A handle is placed by its centre');
        equal(button.style.top, `${50 - size / 2}px`);
        handles.disable('rowAfter');
        equal(button.disabled, true);
        handles.disable('rowAfter', false);
        equal(button.disabled, false);
        handles.frame({left: 10, top: 20, width: 30, height: 40});
        truthy(handles.element.hasAttribute('framed'));
        equal(handles.element.firstElementChild.style.width, '30px');
        handles.frame(null);
        equal(handles.element.hasAttribute('framed'), false);
        throws(() => handles.place('nothing', 0, 0), RangeError);
        throws(() => handles.disable('nothing'), RangeError);
        handles.show(false);
        equal(handles.visible, false);
    } finally {
        handles.dispose();
        chrome.dispose();
    }
});

// Pointing at chrome must never move the selection it acts on, and a disabled
// handle is not a handle at all.
test('handles: pressing and pointing report the handle by name', () => {
    const chrome = new Chrome(document, {name: 'test'});
    const pressed = [];
    const ran = [];
    const handles = new Handles(chrome.root, {
        handles: DESCRIPTORS,
        press: name => pressed.push(name),
        action: name => ran.push(name),
    });
    try {
        const button = handles.button('rowAfter');
        const down = new PointerEvent('pointerdown', {bubbles: true, cancelable: true, composed: true, pointerId: 1});
        button.dispatchEvent(down);
        equal(pressed, ['rowAfter']);
        truthy(down.defaultPrevented, 'Pointing at a handle keeps the selection');
        button.dispatchEvent(new MouseEvent('click', {bubbles: true, composed: true}));
        equal(ran, ['rowAfter']);

        handles.disable('rowAfter');
        button.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerId: 1}));
        button.dispatchEvent(new MouseEvent('click', {bubbles: true, composed: true}));
        equal(pressed.length, 1, 'A disabled handle answers to nothing');
        equal(ran.length, 1);
    } finally {
        handles.dispose();
        chrome.dispose();
    }
});

// Anything with a rectangle can use them, inside this engine or outside it.
test('handles: given a document they bring their own root', () => {
    const handles = new Handles(document, {name: 'standalone', handles: DESCRIPTORS});
    const outer = handles.element.getRootNode().host;
    try {
        truthy(outer.isConnected, 'It places itself in the document');
        equal(outer.dataset.u2RteChrome, 'handles');
        equal(outer.shadowRoot.querySelectorAll('style').length, 1, 'With the rules it needs');
        same(handles.button('rowAfter').getRootNode(), outer.shadowRoot);
    } finally {
        handles.dispose();
    }
    equal(outer.isConnected, false, 'Disposing takes the root it made with it');
    equal(handles.connected, false);
});
