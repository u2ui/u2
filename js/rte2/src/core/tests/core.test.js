import {Rte} from '../core.js';
import {enabled} from '../../config/config.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('core: accepts only a Document or ShadowRoot context', () => {
    throws(() => new Rte(document.createElement('div')), TypeError);
    throws(() => new Rte(document.createDocumentFragment()), TypeError);
    const host = document.body.appendChild(document.createElement('div'));
    const root = host.attachShadow({mode: 'open'});
    const core = new Rte(root, {auto: false});
    same(core.root, root);
    core.dispose();
    host.remove();
});

test('core: add is idempotent and validates editable ownership', () => withFixture(
    '<div id=host contenteditable></div><div id=plain></div><div id=invalid contenteditable=inherit></div><div id=text contenteditable=plaintext-only></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.querySelector('#host');
        same(core.add(host), core.add(host));
        equal(core.surfaces.length, 1);
        throws(() => core.add(root.querySelector('#plain')), TypeError);
        throws(() => core.add(root.querySelector('#invalid')), TypeError);
        truthy(core.add(root.querySelector('#text')));
        const fragment = document.createDocumentFragment();
        const foreign = document.createElement('div');
        foreign.contentEditable = 'true';
        fragment.append(foreign);
        throws(() => core.add(foreign), RangeError);
        core.dispose();
    }
));

test('core: focusing a false nested boundary deactivates its outer surface', () => withFixture(
    '<div id=outer contenteditable><button id=inner contenteditable=false>control</button></div>', root => {
        const core = new Rte(document, {auto: false});
        const outer = core.add(root.querySelector('#outer'));
        core.activate(outer);
        root.querySelector('#inner').dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
        equal(core.active, null);
        core.dispose();
    }
));

test('core: CSS opt-in registers lazily from focus events', () => withFixture(`
    <div id=enabled contenteditable style="--u2-rte:true">one</div>
    <div id=disabled contenteditable>two</div>
`, root => {
    const core = new Rte(document);
    const active = root.querySelector('#enabled');
    truthy(enabled(active), 'The CSS opt-in was not computed as enabled');
    active.dispatchEvent(new FocusEvent('focus', {composed: true}));
    active.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
    truthy(core.get(active), 'The core did not register the focused CSS opt-in');
    same(core.active.element, active);
    equal(core.surfaces.length, 1);
    const disabled = root.querySelector('#disabled');
    disabled.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
    equal(core.get(disabled), null);
    equal(core.active, null);
    core.dispose();
}));

test('core: activation switches exactly one surface', () => withFixture(`
    <div id=one contenteditable></div><div id=two contenteditable></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const one = core.add(root.querySelector('#one'));
    const two = core.add(root.querySelector('#two'));
    core.activate(one);
    truthy(one.active);
    core.activate(two);
    equal(one.active, false);
    truthy(two.active);
    same(core.active, two);
    core.dispose();
}));

test('core: sync routes selection and preserves backward direction', () => withFixture(
    '<div contenteditable>alpha beta</div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const text = surface.element.firstChild;
        getSelection().setBaseAndExtent(text, 5, text, 0);
        same(core.sync(), surface);
        same(core.active, surface);
        equal(surface.selection.text, 'alpha');
        equal(surface.selection.backward, true);
        core.dispose();
    }
));

test('core: a nested editable is an isolation boundary', () => withFixture(`
    <div id=outer contenteditable>outer <span id=inner contenteditable>inner</span></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const outer = core.add(root.querySelector('#outer'));
    const inner = root.querySelector('#inner');
    core.activate(outer);
    getSelection().setBaseAndExtent(inner.firstChild, 0, inner.firstChild, 5);
    equal(core.sync(), null);
    equal(core.active, null);
    const nested = core.add(inner);
    same(core.sync(), nested);
    equal(outer.selection, null);
    core.dispose();
}));

test('core: delete and disposal disconnect surfaces and listeners once', () => withFixture(`
    <div id=one contenteditable></div>
    <div id=auto contenteditable style="--u2-rte:true"></div>
`, root => {
    const core = new Rte(document);
    let disposed = 0;
    core.addEventListener('u2-rte-dispose', () => disposed++);
    const surface = core.add(root.querySelector('#one'));
    truthy(core.delete(surface));
    equal(surface.connected, false);
    equal(core.delete(surface), false);
    core[Symbol.dispose]();
    core.dispose();
    equal(disposed, 1);
    const auto = root.querySelector('#auto');
    auto.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
    equal(core.get(auto), null);
}));
