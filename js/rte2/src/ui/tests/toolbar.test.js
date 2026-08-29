import {Toolbar} from '../toolbar.js';
import {Commands} from '../../command/commands.js';
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
    <div id=two contenteditable style="--u2-rte-toolbar: action"></div>
    <div id=toolbar><button data-command=toggle data-state></button><button data-command=action></button><button data-command=unknown></button></div>
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

test('toolbar: preserves a saved selection for pointer and keyboard commands', () => withFixture(`
    <div contenteditable>text</div>
    <div id=toolbar><button data-command=toggle data-state data-shortcut=b></button></div>
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

    const shortcut = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, ctrlKey: true, key: 'b'});
    surface.element.dispatchEvent(shortcut);
    truthy(shortcut.defaultPrevented);
    equal(runs, 2);
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
