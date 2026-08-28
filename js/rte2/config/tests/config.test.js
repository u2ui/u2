import {config, enabled, hostDefaults} from '../config.js';
import {equal, test, truthy, withFixture} from '../../tests/harness.js';

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
    <p id=p contenteditable></p>
    <table><tbody id=tbody contenteditable></tbody></table>
`, root => {
    equal(hostDefaults(root.querySelector('#div')), {block: 'p', enter: 'block'});
    equal(hostDefaults(root.querySelector('#ul')), {block: 'li', enter: 'item'});
    equal(hostDefaults(root.querySelector('#p')), {block: null, enter: 'break'});
    equal(hostDefaults(root.querySelector('#tbody')), {block: 'tr', enter: 'row'});
    truthy(Object.isFrozen(hostDefaults(root.querySelector('#div'))));
}));

test('config: semantic defaults form a complete immutable snapshot', () => withFixture(
    '<ul contenteditable></ul>', root => {
        const result = config(root.firstElementChild);
        equal(result.block, 'li');
        equal(result.enter, 'item');
        equal(result.cleanup, 'structural');
        equal(result.cleanOn, ['input', 'paste', 'drop', 'command']);
        equal(result.ui, 'roaming');
        truthy(Object.isFrozen(result));
        truthy(Object.isFrozen(result.cleanOn));
    }
));

test('config: custom properties override host defaults and inherit', () => withFixture(`
    <section style="--u2-rte-block: section; --u2-rte-enter: break; --u2-rte-cleanup: minimal; --u2-rte-clean-on: paste drop; --u2-rte-ui: static">
        <div contenteditable></div>
    </section>
`, root => {
    const result = config(root.querySelector('[contenteditable]'));
    equal(result.block, 'section');
    equal(result.enter, 'break');
    equal(result.cleanup, 'minimal');
    equal(result.cleanOn, ['paste', 'drop']);
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
