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

// A part states its own display, and an id outranks the class that would hide it:
// `hidden` that does not hide is exactly the bug a property assertion cannot see.
test('chrome: a hidden part is not rendered, whatever it styles itself', () => withChrome(chrome => {
    const part = chrome.part('panel-ish', '#panel-ish { display: flex }');
    part.className = 'panel';
    equal(getComputedStyle(part).display, 'flex');
    part.hidden = true;
    equal(getComputedStyle(part).display, 'none');
}));

// The size is meant to be changed — deliberately. Everything inside measures in
// em against the host, so the page's own root font moves nothing here.
test('chrome: one property scales the chrome, the page font does not', () => withChrome(chrome => {
    const part = chrome.part('sized', '#sized { padding: 1em }');
    equal(getComputedStyle(part).paddingTop, '14px');
    document.documentElement.style.fontSize = '32px';
    equal(getComputedStyle(part).paddingTop, '14px', 'A page that resizes itself leaves this alone');
    document.documentElement.style.fontSize = '';
    document.body.style.setProperty('--u2-rte-ui-size', '20px');
    equal(getComputedStyle(part).paddingTop, '20px');
    document.body.style.removeProperty('--u2-rte-ui-size');
}));

// The top layer is ordered by when each member was shown, so a page popover
// opened after the editor would sit over it for good. What the editor draws is
// the most recent thing the user triggered, so showing it again puts it back on
// top — which is one close and one open, as its own toggle events report.
test('chrome: drawing something puts the chrome back in front', () => withChrome(async chrome => {
    if (typeof chrome.element.showPopover !== 'function') return;
    const part = chrome.part('late');
    part.hidden = true;
    const toggles = [];
    chrome.element.addEventListener('toggle', event => toggles.push(event.newState));
    part.hidden = false;
    await new Promise(resolve => setTimeout(resolve, 50));
    // A popover nobody touches reports nothing, and the engine collapses the
    // close and the open back into one event — so any report at all is the
    // re-show, and the state after it is what matters.
    truthy(toggles.length, 'It was shown again');
    truthy(chrome.element.matches(':popover-open'));
}));

test('chrome: registers one stylesheet per key', () => withChrome(chrome => {
    same(chrome.style('a', 'p { color: red }'), chrome);
    chrome.style('a', 'p { color: blue }');
    chrome.style('b', 'p { color: green }');
    const styles = [...chrome.root.querySelectorAll('style[id]')];
    equal(styles.length, 2);
    equal(styles[0].textContent, 'p { color: red }', 'The first registration is the one that counts');
}));

// One key, one name: the node's id is the stylesheet's, so a piece of chrome is
// never named twice and a second claim on the same name is an error, not a
// silent second element.
test('chrome: a part is one node and one stylesheet under one key', () => withChrome(chrome => {
    const form = chrome.part('link', '#link { color: red }', 'form');
    equal(form.tagName, 'FORM');
    equal(form.id, 'link');
    same(chrome.root.getElementById('link'), form);
    truthy(chrome.root.getElementById('link-style'));
    throws(() => chrome.part('link'), RangeError);
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
    const done = () => chrome.dispose();
    try {
        const result = run(chrome);
        return result?.then ? result.finally(done) : (done(), result);
    } catch (error) {
        done();
        throw error;
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
