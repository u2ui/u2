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

test('core: retained UI keeps the active surface across focus', () => withFixture(
    '<div id=outer contenteditable>text</div><div id=ui contenteditable=false><button>control</button></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.querySelector('#outer'));
        const ui = root.querySelector('#ui');
        const button = ui.firstElementChild;
        same(core.retain(ui), ui);
        truthy(core.retains(button));
        core.activate(surface);
        button.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
        same(core.active, surface);
        truthy(core.release(ui));
        equal(core.release(ui), false);
        button.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
        equal(core.active, null);
        throws(() => core.retain(null), TypeError);
        const foreign = document.implementation.createHTMLDocument().createElement('div');
        throws(() => core.retain(foreign), RangeError);
        core.dispose();
    }
));

// Clicking a plain paragraph focuses nothing at all, so no focus event follows
// to end the session — and everything drawn for it would stay on screen.
test('core: focus falling out of everything ends the session', () => withFixture(
    '<div id=outer contenteditable>text</div><div id=ui contenteditable=false><button>control</button></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.querySelector('#outer'));
        const ui = core.retain(root.querySelector('#ui'));
        const out = type => new FocusEvent('focusout', {bubbles: true, composed: true, relatedTarget: type});
        core.activate(surface);
        surface.element.dispatchEvent(out(ui.firstElementChild));
        same(core.active, surface, 'Retained UI is where the session goes on');
        surface.element.dispatchEvent(out(surface.element));
        same(core.active, surface, 'So is the surface itself');
        surface.element.dispatchEvent(out(null));
        equal(core.active, null);
        core.dispose();
    }
));

// Engines leave a selection inside an editable that nobody focused — clicking
// beside one does that — and a toolbar over a caret the keyboard cannot reach is
// worse than no toolbar.
test('core: a selection alone does not start a session the focus has left', () => withFixture(
    '<div contenteditable><p>one two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const text = surface.element.querySelector('p').firstChild;
        const event = type => new FocusEvent(type, {bubbles: true, composed: true});
        getSelection().setBaseAndExtent(text, 0, text, 3);
        same(core.sync(), surface);
        surface.element.dispatchEvent(event('focusout'));
        equal(core.active, null);
        equal(core.sync(), null, 'The selection is still there, the session is not');
        equal(surface.selection.text, 'one', 'What the surface captured, it keeps');
        surface.element.dispatchEvent(event('focusin'));
        same(core.active, surface, 'Focus is what brings it back');
        same(core.sync(), surface);
        core.dispose();
    }
));

// An engine gives the focus to the nearest editable when a press lands beside
// one — an inline host collects its whole line — and the caret it leaves behind
// is one nobody asked for.
test('core: a press beside a surface does not start editing it', () => withFixture(
    '<p id=around>text <span id=ed contenteditable>editable</span></p>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.querySelector('#ed'));
        const around = root.querySelector('#around');
        const press = target => target.dispatchEvent(
            new PointerEvent('pointerdown', {bubbles: true, composed: true, pointerId: 1}));
        const focused = () => surface.element.dispatchEvent(
            new FocusEvent('focusin', {bubbles: true, composed: true}));
        const release = target => target.dispatchEvent(
            new PointerEvent('pointerup', {bubbles: true, composed: true, pointerId: 1}));
        press(around);
        focused();
        equal(core.active, null, 'The press landed beside it');
        focused();
        equal(core.active, null, 'And answers for every focus it causes: one drag hands it back twice');
        release(around);
        focused();
        same(core.active, surface, 'Once the press is over, focus is focus again');

        press(surface.element);
        focused();
        same(core.active, surface, 'A press that landed in it starts editing');
        release(surface.element);

        press(around);
        focused();
        equal(core.active, null);
        around.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, composed: true, key: 'Tab'}));
        focused();
        same(core.active, surface, 'A key takes over from a release that never came');
        core.dispose();
    }
));

// `<a><span contenteditable>` is a host shape engines answer with the element:
// the link is dragged rather than giving the text a caret, and followed when the
// press ends.
test('core: a link around a surface neither drags nor follows', () => withFixture(
    '<a id=link href="#docs">before <span id=host contenteditable>text</span> after</a>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.querySelector('#host');
        const link = root.querySelector('#link');
        core.add(host);
        const press = target => target.dispatchEvent(
            new PointerEvent('pointerdown', {bubbles: true, composed: true, pointerId: 1}));
        const tap = target => {
            const event = new MouseEvent('click', {bubbles: true, composed: true, cancelable: true});
            target.dispatchEvent(event);
            return event.defaultPrevented;
        };
        equal(link.hasAttribute('draggable'), false);
        press(host);
        equal(link.getAttribute('draggable'), 'false', 'A link nobody can drag is one whose text can have a caret');
        equal(tap(host), true, 'The press belonged to the text, and so does its release');
        // A fragment, because the assertion is that this one really is followed.
        equal(tap(link), false, 'The link itself still works');
        core.dispose();
    }
));

// A label hands a press to the control it names, editable content and all: the
// caret would land in the field instead of in the text someone clicked.
test('core: a label around a surface keeps the press to itself', () => withFixture(
    '<label id=label for=field contenteditable>Name</label><input id=field>', root => {
        const core = new Rte(document, {auto: false});
        const label = root.querySelector('#label');
        core.add(label);
        const event = new MouseEvent('click', {bubbles: true, composed: true, cancelable: true});
        label.dispatchEvent(event);
        equal(event.defaultPrevented, true);
        core.dispose();
    }
));

// The right button opens a menu about what is selected: moving the selection to
// what the menu was aimed at is what makes the menu useless.
test('core: the right button leaves the selection where it is', () => withFixture(
    '<div contenteditable><p>text</p></div><p id=outside>outside</p>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const press = (target, button) => {
            const event = new PointerEvent('pointerdown',
                {bubbles: true, composed: true, cancelable: true, pointerId: 1, button});
            target.dispatchEvent(event);
            return event.defaultPrevented;
        };
        equal(press(surface.element.querySelector('p'), 2), true);
        equal(press(surface.element.querySelector('p'), 0), false, 'The left button places the caret');
        equal(press(root.querySelector('#outside'), 2), false, 'Outside the editor it is not ours');
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

// A press in the editor's own retained ui — a select in its toolbar — hands the focus back to the
// surface it acts on. Refusing that session would take the toolbar away in the middle of a command.
test('core: a press in retained ui keeps the session it returns to', () => withFixture(
    '<div id=host contenteditable><p>text</p></div><div id=ui><select><option>x</option></select></div>',
    root => {
        const core = new Rte(document, {auto: false});
        try {
            const host = root.querySelector('#host');
            const ui = core.retain(root.querySelector('#ui'));
            const surface = core.add(host);
            core.activate(surface);
            const select = ui.querySelector('select');
            select.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, composed: true}));
            select.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
            // What a command does when it is done: the caret goes back to the surface it acted on.
            host.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}));
            same(core.active, surface, 'The session survived its own control');
        } finally {
            core.dispose();
        }
    }
));
