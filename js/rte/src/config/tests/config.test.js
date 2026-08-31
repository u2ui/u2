import {config, elementPresets, enabled, hostDefaults, inlineUi} from '../config.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

test('config: RTE is opt-in and accepts common false values', () => withFixture(`
    <div id=off contenteditable></div>
    <div id=on contenteditable style="--u2-rte: true"></div>
    <div id=false contenteditable style="--u2-rte: false"></div>
`, root => {
    equal(enabled(root.querySelector('#off')), false);
    equal(enabled(root.querySelector('#on')), true);
    equal(enabled(root.querySelector('#false')), false);
}));

test('config: host defaults follow HTML editing context', () => withFixture(`
    <div id=div contenteditable></div>
    <ul id=ul contenteditable></ul>
    <li id=li contenteditable></li>
    <p id=p contenteditable></p>
    <table>
        <caption id=caption contenteditable></caption>
        <tbody id=tbody contenteditable><tr><th id=th contenteditable></th><td id=td contenteditable></td></tr></tbody>
    </table>
`, root => {
    equal(hostDefaults(root.querySelector('#div')), {block: 'p', enter: 'block'});
    equal(hostDefaults(root.querySelector('#ul')), {block: 'li', enter: 'item'});
    equal(hostDefaults(root.querySelector('#li')), {block: null, enter: 'break'});
    equal(hostDefaults(root.querySelector('#p')), {block: null, enter: 'break'});
    equal(hostDefaults(root.querySelector('#caption')), {block: null, enter: 'break'});
    equal(hostDefaults(root.querySelector('#tbody')), {block: 'tr', enter: 'row'});
    equal(hostDefaults(root.querySelector('#th')), {block: null, enter: 'break'});
    equal(hostDefaults(root.querySelector('#td')), {block: null, enter: 'break'});
    truthy(Object.isFrozen(hostDefaults(root.querySelector('#div'))));
}));

test('config: semantic defaults form a complete immutable snapshot', () => withFixture(
    '<ul contenteditable></ul>', root => {
        const result = config(root.firstElementChild);
        equal(result.block, 'li');
        equal(result.enter, 'item');
        equal(result.cleanup, 'structural');
        equal(result.cleanOn, ['input', 'paste', 'drop', 'command']);
        equal(result.elements, null);
        equal(result.importUnstyle, 'classes');
        equal(result.ui, 'roaming');
        truthy(Object.isFrozen(result));
        truthy(Object.isFrozen(result.cleanOn));
    }
));

test('config: element policies accept presets and explicit narrowing', () => withFixture(`
    <div id=preset contenteditable style="--u2-rte-elements:@article"></div>
    <div id=custom contenteditable style="--u2-rte-elements:p, h1 x-card"></div>
    <div id=invalid contenteditable style="--u2-rte-elements:@missing"></div>
`, root => {
    same(config(root.querySelector('#preset')).elements, elementPresets.article);
    equal(config(root.querySelector('#custom')).elements, ['p', 'h1', 'x-card']);
    equal(config(root.querySelector('#invalid')).elements, [], 'An invalid policy must not broaden allowed content');
    truthy(Object.isFrozen(elementPresets.article));
}));

test('config: custom properties override host defaults and inherit', () => withFixture(`
    <section style="--u2-rte-block: section; --u2-rte-enter: break; --u2-rte-cleanup: minimal; --u2-rte-clean-on: paste drop; --u2-rte-import-unstyle: none; --u2-rte-ui: static">
        <div contenteditable></div>
    </section>
`, root => {
    const result = config(root.querySelector('[contenteditable]'));
    equal(result.block, 'section');
    equal(result.enter, 'break');
    equal(result.cleanup, 'minimal');
    equal(result.cleanOn, ['paste', 'drop']);
    equal(result.importUnstyle, 'none');
    equal(result.ui, 'static');
}));

test('config: auto and invalid enums fall back without leaking invalid state', () => withFixture(`
    <ol contenteditable style="--u2-rte-block:auto; --u2-rte-enter:nope; --u2-rte-cleanup:deep; --u2-rte-ui:toolbar"></ol>
`, root => {
    const result = config(root.firstElementChild);
    equal(result.block, 'li');
    equal(result.enter, 'item');
    equal(result.cleanup, 'structural');
    equal(result.ui, 'roaming');
}));

test('config: block none supports inline-only custom hosts', () => withFixture(
    '<div contenteditable style="--u2-rte-block:none"></div>', root => {
        equal(config(root.firstElementChild).block, null);
    }
));

test('config: only usable tag names become the default block', () => withFixture(`
    <div id=cased contenteditable style="--u2-rte-block: DIV"></div>
    <div id=custom contenteditable style="--u2-rte-block: x-block"></div>
    <ul id=quoted contenteditable style='--u2-rte-block: "p"'></ul>
    <ul id=list contenteditable style="--u2-rte-block: p div"></ul>
`, root => {
    equal(config(root.querySelector('#cased')).block, 'div');
    equal(config(root.querySelector('#custom')).block, 'x-block');
    equal(config(root.querySelector('#quoted')).block, 'li', 'A quoted value must not reach createElement()');
    equal(config(root.querySelector('#list')).block, 'li', 'A value list must not reach createElement()');
}));

test('config: cleanup triggers accept space and comma separated lists', () => withFixture(
    '<div contenteditable style="--u2-rte-clean-on: paste, drop"></div>', root => {
        equal(config(root.firstElementChild).cleanOn, ['paste', 'drop']);
    }
));

// Which contextual UIs a field draws is a property of the field, not of the
// module set: the same editor serves a body of text and a bare teaser field.
test('config: inline ui is every one by default, and a named list otherwise', () => withFixture(
    '<div contenteditable></div>', root => {
        const host = root.firstElementChild;
        equal(config(host).inlineUi, null);
        truthy(inlineUi(config(host), 'link'));
        host.style.setProperty('--u2-rte-inline-ui', 'table, image');
        equal(config(host).inlineUi.join(' '), 'table image');
        truthy(inlineUi(config(host), 'image'));
        equal(inlineUi(config(host), 'link'), false);
        host.style.setProperty('--u2-rte-inline-ui', 'none');
        equal(config(host).inlineUi.length, 0);
        equal(inlineUi(config(host), 'table'), false);
    }
));
