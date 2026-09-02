import {Toolbar} from '../toolbar.js';
import {Commands} from '../../command/commands.js';
import {elementOf} from '../../selection/ownership/ownership.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('toolbar: validates its core, element, command resolver, and placement', () => withFixture(
    '<div contenteditable></div><div id=toolbar></div>', root => {
        const core = new Rte(document, {auto: false});
        const toolbar = root.querySelector('#toolbar');
        throws(() => new Toolbar(null, toolbar, {commands() {}}), TypeError);
        throws(() => new Toolbar(core, null, {commands() {}}), TypeError);
        throws(() => new Toolbar(core, toolbar), TypeError);
        throws(() => new Toolbar(core, toolbar, {commands() {}, place: true}), TypeError);
        const foreign = document.implementation.createHTMLDocument().createElement('div');
        throws(() => new Toolbar(core, foreign, {commands() {}}), RangeError);
        core.activate(core.add(root.firstElementChild));
        throws(() => new Toolbar(core, toolbar, {commands: () => ({})}), TypeError);
        core.dispose();
    }
));

test('toolbar: follows the active surface and reflects command availability and state', () => withFixture(`
    <div id=one contenteditable></div>
    <div id=two contenteditable style="--u2-rte-toolbar: aliased"></div>
    <div id=toolbar><button data-command=toggle data-state></button><button data-command=action data-control=aliased></button><button data-command=unknown></button></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const one = core.add(root.querySelector('#one'));
    const two = core.add(root.querySelector('#two'));
    let active = false;
    const registries = new WeakMap([
        [one, new Commands(one, {commands: {
            toggle: {enabled: () => true, state: () => active, run: () => active = !active},
            action: {enabled: () => false, run() {}},
        }})],
        [two, new Commands(two, {commands: {action: {enabled: () => true, run() {}}}})],
    ]);
    let placed = 0;
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {
        commands: surface => registries.get(surface),
        place: () => placed++,
    });
    const [toggle, action, unknown] = element.children;
    truthy(element.hidden);

    core.activate(one);
    equal(toolbar.surface, one);
    same(toolbar.commands, registries.get(one));
    equal(element.hidden, false);
    equal(element.getAttribute('role'), 'toolbar');
    equal(toggle.getAttribute('aria-pressed'), 'false');
    equal(toggle.disabled, false);
    equal(action.disabled, true);
    truthy(unknown.hidden);
    equal(placed, 1);

    toggle.click();
    equal(toggle.getAttribute('aria-pressed'), 'true');
    core.activate(two);
    truthy(toggle.hidden, 'The surface CSS command list must hide unlisted items');
    equal(action.hidden, false);
    equal(action.disabled, false);
    equal(action.hasAttribute('aria-pressed'), false);
    toolbar.dispose();
    core.dispose();
}));

test('toolbar: preserves a saved selection across pointer focus', () => withFixture(`
    <div contenteditable>text</div>
    <div id=toolbar><button data-command=toggle data-state></button></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    let runs = 0;
    const commands = new Commands(surface, {commands: {toggle: {
        state: () => false,
        run(edit) {
            truthy(edit.range?.collapsed);
            runs++;
        },
    }}});
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    const button = element.firstElementChild;
    getSelection().setBaseAndExtent(surface.element.firstChild, 2, surface.element.firstChild, 2);
    core.sync();
    equal(button.disabled, false);

    const down = new Event('pointerdown', {bubbles: true, cancelable: true});
    button.dispatchEvent(down);
    truthy(down.defaultPrevented);
    getSelection().removeAllRanges();
    button.focus();
    equal(commands.enabled('toggle'), false, 'The live selection left the editor');
    toolbar.refresh();
    equal(button.disabled, false, 'Toolbar state must use the saved editor selection');
    button.click();
    equal(runs, 1);
    same(getSelection().anchorNode, surface.element.firstChild);
    equal(getSelection().anchorOffset, 2);
    toolbar.dispose();
    core.dispose();
}));

test('toolbar: hiding, disconnect, and disposal leave no active bindings', () => withFixture(`
    <div contenteditable style="--u2-rte-ui:none"></div>
    <div id=toolbar><button data-command=action></button></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    let runs = 0;
    const commands = new Commands(surface, {commands: {action: {enabled: () => true, run: () => runs++}}});
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    core.activate(surface);
    equal(toolbar.refresh(), false);
    truthy(element.hidden);
    surface.element.style.setProperty('--u2-rte-ui', 'roaming');
    equal(toolbar.refresh(), true);
    core.delete(surface);
    truthy(element.hidden);
    equal(toolbar.surface, null);
    core.dispose();
    equal(toolbar.connected, false);
    toolbar.dispose();
    element.firstElementChild.click();
    equal(runs, 0);
}));

// Focus that goes somewhere else ends the session and takes every contextual UI
// with it — but a control is not somewhere else, which is what `retain` says.
test('toolbar: a control taking the focus does not end the session', () => withFixture(`
    <div contenteditable>text</div>
    <button id=outside>Outside</button>
    <div id=toolbar><button data-command=action></button></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    const commands = new Commands(surface, {commands: {action: {enabled: () => true, run() {}}}});
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    core.activate(surface);
    element.firstElementChild.focus();
    same(core.active, surface, 'A toolbar button is the editor');
    root.querySelector('#outside').focus();
    same(core.active, null, 'Anything else is not');
    toolbar.dispose();
    core.dispose();
}));

test('toolbar: it goes with the session, and comes back with the surface', () => withFixture(`
    <div contenteditable>text</div>
    <button id=outside>Outside</button>
    <div id=toolbar><button data-command=action></button></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    const commands = new Commands(surface, {commands: {action: {enabled: () => true, run() {}}}});
    const element = root.querySelector('#toolbar');
    const button = element.firstElementChild;
    const outside = root.querySelector('#outside');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    core.activate(surface);
    equal(element.hidden, false);

    surface.element.dispatchEvent(focus('focusout', outside));
    truthy(element.hidden);
    surface.emit('u2-rte-selectionchange');
    truthy(element.hidden, 'A late selection event must not reopen a closed session');
    surface.element.dispatchEvent(focus('focusin'));
    equal(element.hidden, false);

    surface.element.dispatchEvent(focus('focusout', button));
    equal(element.hidden, false, 'Moving into the toolbar keeps the editing session open');
    button.dispatchEvent(focus('focusout', outside));
    truthy(element.hidden);
    button.dispatchEvent(focus('focusin'));
    truthy(element.hidden, 'The session is over: a control has nothing left to act on');
    surface.element.dispatchEvent(focus('focusin'));
    equal(element.hidden, false, 'The surface is what brings it back');
    toolbar.dispose();
    core.dispose();
}));

test('toolbar: selection-only mode hides collapsed and missing selections', () => withFixture(`
    <div contenteditable style="--u2-rte-toolbar-when:selection">text</div>
    <div id=toolbar><button data-command=action></button></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    const commands = new Commands(surface, {commands: {action: {enabled: () => true, run() {}}}});
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    core.activate(surface);
    truthy(element.hidden, 'No saved range must not open a selection-only toolbar');

    const text = surface.element.firstChild;
    getSelection().collapse(text, 2);
    core.sync();
    truthy(element.hidden, 'A caret is not a selected range');
    getSelection().setBaseAndExtent(text, 1, text, 3);
    core.sync();
    equal(element.hidden, false);

    getSelection().collapse(text, 2);
    core.sync();
    truthy(element.hidden);
    surface.element.style.setProperty('--u2-rte-toolbar-when', 'always');
    equal(toolbar.refresh(), true);
    equal(element.hidden, false);
    toolbar.dispose();
    core.dispose();
}));

test('toolbar: an application popover follows visibility in the top layer', () => withFixture(`
    <div contenteditable>text</div>
    <div id=toolbar popover=manual><button data-command=action></button></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    const commands = new Commands(surface, {commands: {action: {enabled: () => true, run() {}}}});
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    core.activate(surface);
    truthy(element.matches(':popover-open'));
    surface.element.style.setProperty('--u2-rte-ui', 'none');
    equal(toolbar.refresh(), false);
    equal(element.matches(':popover-open'), false);
    surface.element.style.setProperty('--u2-rte-ui', 'roaming');
    truthy(toolbar.refresh());
    truthy(element.matches(':popover-open'));
    toolbar.dispose();
    equal(element.matches(':popover-open'), false);
    core.dispose();
}));

test('toolbar: a command-value select reflects one or mixed command states', () => withFixture(`
    <div contenteditable style="--u2-rte-toolbar:block">text</div>
    <div id=toolbar>
        <select data-command-value=blockStyle data-control=block aria-label="Block style">
            <option value="">Block style</option>
            <option value="paragraph">Paragraph</option>
            <option value="h1">Heading 1</option>
        </select>
    </div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    let current = 'paragraph';
    let runs = 0;
    const commands = new Commands(surface, {commands: {blockStyle: {
        enabled: () => true,
        state: () => current,
        run: edit => { current = edit.value; runs++; },
    }}});
    const toolbar = new Toolbar(core, root.querySelector('#toolbar'), {commands: () => commands});
    getSelection().collapse(surface.element.firstChild, 1);
    core.sync();
    const select = root.querySelector('select');
    const paragraph = select.querySelector('[value=paragraph]');
    const heading = select.querySelector('[value=h1]');
    equal(select.hidden, false);
    equal(paragraph.hidden, false);
    equal(heading.hidden, false);
    equal(select.value, 'paragraph');
    select.value = 'h1';
    select.dispatchEvent(new Event('change', {bubbles: true}));
    equal(runs, 1);
    equal(select.value, 'h1');

    commands.get('blockStyle').enabled = edit => edit.value !== 'h1';
    toolbar.refresh();
    equal(paragraph.hidden, false);
    truthy(heading.hidden);
    truthy(heading.disabled);
    equal(select.value, '', 'An unsupported current value falls back to the placeholder');
    select.value = 'h1';
    select.dispatchEvent(new Event('change', {bubbles: true}));
    equal(runs, 1, 'A programmatic selection cannot bypass option availability');

    commands.get('blockStyle').state = () => 'mixed';
    toolbar.refresh();
    equal(select.value, '');
    toolbar.dispose();
    core.dispose();
}));

function focus(type, relatedTarget = null) {
    return new FocusEvent(type, {bubbles: true, composed: true, relatedTarget});
}

test('toolbar: pointing at a control that cannot run keeps the toolbar open', () => withFixture(`
    <div contenteditable>text</div>
    <div id=toolbar><button data-command=toggle></button></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    const commands = new Commands(surface, {commands: {toggle: {enabled: () => false, run() {}}}});
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    getSelection().setBaseAndExtent(surface.element.firstChild, 0, surface.element.firstChild, 4);
    core.sync();
    const button = element.firstElementChild;
    truthy(button.disabled, 'The control has nothing to run');
    equal(element.hidden, false);
    const down = new Event('pointerdown', {bubbles: true, cancelable: true});
    button.dispatchEvent(down);
    truthy(down.defaultPrevented, 'The selection stays where it is, so the toolbar stays open');
    equal(element.hidden, false);
    toolbar.dispose();
    core.dispose();
}));

// Presence follows the configuration, availability the selection: a toolbar that
// rearranged itself as the caret moved would move its targets out from under the
// pointer.
test('toolbar: a configured select stays and disables where it cannot apply', () => withFixture(`
    <div contenteditable><p>text</p><pre>code</pre></div>
    <div id=toolbar><select data-command-value=style data-control=style>
        <option value="" disabled>Style</option><option value=lead>Lead</option>
    </select></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    const commands = new Commands(surface, {commands: {style: {
        enabled: edit => elementOf(edit.range?.start.node)?.localName !== 'pre',
        state: () => null,
        run() {},
    }}});
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    const select = element.querySelector('select');

    const text = surface.element.querySelector('p').firstChild;
    getSelection().setBaseAndExtent(text, 0, text, 4);
    core.sync();
    equal(select.hidden, false);
    equal(select.disabled, false);

    const code = surface.element.querySelector('pre').firstChild;
    getSelection().setBaseAndExtent(code, 0, code, 4);
    core.sync();
    equal(select.hidden, false, 'It exists here, it just cannot act');
    equal(select.disabled, true);
    toolbar.dispose();
    core.dispose();
}));

test('toolbar: a select with no configured choice is absent', () => withFixture(`
    <div contenteditable>text</div>
    <div id=toolbar><select data-command-value=style><option value="" disabled>Style</option></select></div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    const commands = new Commands(surface, {commands: {style: {enabled: () => true, run() {}}}});
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    getSelection().setBaseAndExtent(surface.element.firstChild, 0, surface.element.firstChild, 4);
    core.sync();
    equal(element.querySelector('select').hidden, true, 'Nothing to offer is nothing to be');
    toolbar.dispose();
    core.dispose();
}));

test('toolbar: a host may hide what it cannot use instead of disabling it', () => withFixture(`
    <div contenteditable style="--u2-rte-toolbar-unavailable: hide"><p>text</p><pre>code</pre></div>
    <div id=toolbar>
        <button data-command=toggle></button>
        <select data-command-value=style><option value="" disabled>Style</option><option value=lead>Lead</option></select>
    </div>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.firstElementChild);
    const usable = edit => elementOf(edit.range?.start.node)?.localName !== 'pre';
    const commands = new Commands(surface, {commands: {
        toggle: {enabled: usable, run() {}},
        style: {enabled: usable, state: () => null, run() {}},
    }});
    const element = root.querySelector('#toolbar');
    const toolbar = new Toolbar(core, element, {commands: () => commands});
    const button = element.querySelector('button');
    const select = element.querySelector('select');

    const text = surface.element.querySelector('p').firstChild;
    getSelection().setBaseAndExtent(text, 0, text, 4);
    core.sync();
    equal(button.hidden, false);
    equal(select.hidden, false);

    const code = surface.element.querySelector('pre').firstChild;
    getSelection().setBaseAndExtent(code, 0, code, 4);
    core.sync();
    equal(button.hidden, true, 'The host asked for a toolbar of what it can do');
    equal(select.hidden, true);
    equal(element.hidden, true, 'Nothing usable is nothing to show');
    toolbar.dispose();
    core.dispose();
}));
