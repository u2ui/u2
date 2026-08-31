import {Chrome} from '../chrome.js';
import {equal, same, test, throws, truthy} from '../../../tests/harness.js';

test('chrome: needs a document or shadow root', () => {
    throws(() => new Chrome(null), TypeError);
    throws(() => new Chrome(document.createElement('div')), TypeError);
});

test('chrome: draws into one shadow root and lifts it into the top layer', () => withChrome(chrome => {
    same(chrome.element.parentNode, document.body);
    same(chrome.element.shadowRoot, chrome.root);
    equal(chrome.element.dataset.u2RteChrome, 'chrome');
    if (typeof chrome.element.showPopover === 'function') {
        truthy(chrome.element.matches(':popover-open'), 'Page stacking must not be able to cover the editor');
    }
}));

test('chrome: joins a shadow root it is given', () => {
    const host = document.createElement('div');
    const root = host.attachShadow({mode: 'open'});
    document.body.append(host);
    const chrome = new Chrome(root);
    try {
        same(chrome.element.parentNode, root);
    } finally {
        chrome.dispose();
        host.remove();
    }
});

// The page cannot be trusted to leave the editor alone: a rule as ordinary as
// `[popover] { border: solid }` in a reset stylesheet applies to the host, and
// a normal declaration in a shadow tree would lose to it.
test('chrome: page styles do not reach the host', () => withChrome(chrome => {
    const style = document.createElement('style');
    style.textContent = `
        [popover] { border: 5px solid red; padding: 2em; background: red; overflow: auto; }
        [data-u2-rte-chrome] { position: static; border-block-start: 4px dotted red; }
    `;
    document.head.append(style);
    try {
        const computed = getComputedStyle(chrome.element);
        equal(computed.borderTopWidth, '0px');
        equal(computed.paddingTop, '0px');
        equal(computed.backgroundColor, 'rgba(0, 0, 0, 0)');
        equal(computed.overflow, 'visible');
        equal(computed.position, 'fixed');
        equal(computed.pointerEvents, 'none', 'The host itself must never take the pointer');
    } finally {
        style.remove();
    }
}));

test('chrome: registers one stylesheet per key', () => withChrome(chrome => {
    same(chrome.style('a', 'p { color: red }'), chrome);
    chrome.style('a', 'p { color: blue }');
    chrome.style('b', 'p { color: green }');
    const styles = [...chrome.root.querySelectorAll('style[data-u2-rte-style]')];
    equal(styles.length, 2);
    equal(styles[0].textContent, 'p { color: red }', 'The first registration is the one that counts');
}));

test('chrome: disposal leaves nothing to find', () => {
    const chrome = new Chrome(document);
    chrome.style('a', 'p { color: red }');
    equal(chrome.connected, true);
    chrome.dispose();
    chrome.dispose();
    equal(chrome.connected, false);
    equal(chrome.element.isConnected, false);
    equal(chrome.root.querySelectorAll('*').length, 0);
    chrome.style('a', 'p { color: red }');
    equal(chrome.root.querySelectorAll('*').length, 0, 'A disposed chrome draws nothing');
});

function withChrome(run) {
    const chrome = new Chrome(document);
    try {
        return run(chrome);
    } finally {
        chrome.dispose();
    }
}
