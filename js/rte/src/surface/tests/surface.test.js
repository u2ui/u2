import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

// Read once per burst of work and again when told: a refresh asks dozens of times, and a computed
// style is the expensive part of a path every keystroke goes down.
test('surface: resolves CSS configuration on demand and keeps it until invalidated', () => withFixture(
    '<div contenteditable></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        equal(surface.config.cleanup, 'structural');
        same(surface.config, surface.config, 'The same reading answers twice');
        surface.element.style.setProperty('--u2-rte-cleanup', 'minimal');
        equal(surface.config.cleanup, 'structural', 'What was read stands until it is dropped');
        same(surface.invalidate(), surface);
        equal(surface.config.cleanup, 'minimal');
        core.dispose();
    }
));

test('surface: captures and restores its selection', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const selection = getSelection();
        selection.setBaseAndExtent(surface.element.firstChild, 1, surface.element.firstChild, 4);
        same(surface.capture(), surface.selection);
        selection.removeAllRanges();
        truthy(surface.restore());
        equal(selection.toString(), 'lph');
        core.dispose();
    }
));

test('surface: identical captures reuse state without duplicate events', () => withFixture(
    '<div contenteditable>alpha</div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const selection = getSelection();
        let changes = 0;
        surface.addEventListener('u2-rte-selectionchange', () => changes++);
        selection.setBaseAndExtent(surface.element.firstChild, 1, surface.element.firstChild, 4);
        const first = surface.capture();
        same(surface.capture(), first);
        equal(changes, 1);
        core.dispose();
    }
));

test('surface: rejects a selection owned by another host', () => withFixture(`
    <div id=one contenteditable>one</div><div id=two contenteditable>two</div>
`, root => {
    const core = new Rte(document, {auto: false});
    const one = core.add(root.querySelector('#one'));
    const selection = getSelection();
    const text = root.querySelector('#two').firstChild;
    selection.setBaseAndExtent(text, 0, text, 3);
    equal(one.capture(), null);
    core.dispose();
}));

test('surface: nested transactions reuse one atomic transaction', () => withFixture(
    '<div contenteditable>text</div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        let nested;
        surface.transact(outer => {
            surface.transact(inner => nested = inner);
            same(nested, outer);
            same(surface.transaction, outer);
        });
        equal(surface.transaction, null);
        core.dispose();
    }
));

test('surface: activation events reach the object and DOM host once', () => withFixture(
    '<div contenteditable></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const events = [];
        surface.addEventListener('u2-rte-activate', () => events.push('surface'));
        surface.element.addEventListener('u2-rte-activate', () => events.push('dom'));
        surface.activate().activate();
        equal(events, ['dom', 'surface']);
        truthy(surface.active);
        core.dispose();
    }
));

test('surface: disconnect is idempotent and prevents transactions', () => withFixture(
    '<div contenteditable></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        let disconnected = 0;
        surface.addEventListener('u2-rte-disconnect', () => disconnected++);
        equal(surface.dispose(), undefined);
        equal(core.get(surface.element), null);
        surface[Symbol.dispose]();
        surface.dispose();
        surface.disconnect();
        equal(disconnected, 1);
        equal(surface.connected, false);
        const error = throws(() => surface.transact(() => {}), DOMException);
        equal(error.name, 'InvalidStateError');
        core.dispose();
    }
));

test('surface: the DOM host is notified before the modules that react to an event', () => withFixture(
    '<div contenteditable></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const seen = [];
        surface.addEventListener('u2-rte-change', () => seen.push('module'));
        host.addEventListener('u2-rte-change', () => seen.push('host'));
        surface.transact(() => {});
        equal(seen, ['host', 'module']);
        core.dispose();
    }
));
