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

test('chrome: follows a modal target and returns home when it closes', async () => {
    if (typeof HTMLDialogElement === 'undefined') return;
    const dialog = document.body.appendChild(document.createElement('dialog'));
    dialog.contentEditable = 'true';
    dialog.append('text');
    const chrome = new Chrome(document);
    const button = chrome.root.appendChild(document.createElement('button'));
    try {
        chrome.follow(dialog);
        same(chrome.element.parentNode, document.body);
        await changed(dialog, () => dialog.showModal());
        same(chrome.element.parentNode, dialog, 'Modal inertness requires a flat-tree descendant');
        equal(chrome.element.contentEditable, 'false');
        button.focus();
        same(chrome.root.activeElement, button, 'The remounted chrome remains interactive');
        const closed = new Promise(resolve => dialog.addEventListener('close', resolve, {once: true}));
        await changed(dialog, () => dialog.close());
        await closed;
        same(chrome.element.parentNode, document.body);
    } finally {
        chrome.dispose();
        dialog.close();
        dialog.remove();
    }
});

test('chrome: follows an open popover and returns when it hides', async () => {
    const popover = document.body.appendChild(document.createElement('div'));
    if (typeof popover.showPopover !== 'function') {
        popover.remove();
        return;
    }
    popover.popover = 'manual';
    popover.contentEditable = 'true';
    popover.append('text');
    const chrome = new Chrome(document);
    try {
        chrome.follow(popover);
        await toggle(popover, () => popover.showPopover());
        same(chrome.element.parentNode, popover);
        truthy(chrome.element.matches(':popover-open'));
        await toggle(popover, () => popover.hidePopover());
        same(chrome.element.parentNode, document.body);
        truthy(chrome.element.matches(':popover-open'), 'The chrome restores its own top-layer entry');
    } finally {
        chrome.dispose();
        if (popover.matches(':popover-open')) popover.hidePopover();
        popover.remove();
    }
});

test('chrome: follows fullscreen changes through the same boundary rule', () => withChrome(chrome => {
    const target = document.body.appendChild(document.createElement('div'));
    const matches = target.matches.bind(target);
    try {
        chrome.follow(target);
        target.matches = selector => selector === ':fullscreen' || matches(selector);
        document.dispatchEvent(new Event('fullscreenchange'));
        same(chrome.element.parentNode, target);
        target.matches = matches;
        document.dispatchEvent(new Event('fullscreenchange'));
        same(chrome.element.parentNode, document.body);
    } finally {
        target.remove();
    }
}));

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

function toggle(element, change) {
    const changed = new Promise(resolve => element.addEventListener('toggle', resolve, {once: true}));
    change();
    return changed;
}

function changed(element, change) {
    const mutation = new Promise(resolve => {
        const observer = new MutationObserver(() => {
            observer.disconnect();
            resolve();
        });
        observer.observe(element, {attributes: true, attributeFilter: ['open']});
    });
    change();
    return mutation;
}
