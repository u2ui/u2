import {Rte} from '../../core/core.js';
import {Transaction} from '../transaction.js';
import {equal, same, test, throws, truthy, withFixture} from '../../tests/harness.js';

test('transaction: runs once, returns the command result, and commits', () => withFixture(
    '<div contenteditable>text</div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const transaction = new Transaction(surface, {inputType: 'formatBold'});
        const result = transaction.run(current => {
            same(current, transaction);
            return 42;
        });
        equal(result, 42);
        equal(transaction.state, 'committed');
        equal(transaction.options.inputType, 'formatBold');
        equal(transaction.selectionBefore, null);
        equal(transaction.selectionAfter, null);
        const error = throws(() => transaction.run(() => {}), DOMException);
        equal(error.name, 'InvalidStateError');
        core.destroy();
    }
));

test('transaction: emits ordered local and DOM lifecycle events', () => withFixture(
    '<div contenteditable>text</div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const events = [];
        surface.addEventListener('u2-rte-beforechange', () => events.push('surface-before'));
        surface.element.addEventListener('u2-rte-beforechange', () => events.push('dom-before'));
        surface.addEventListener('u2-rte-change', () => events.push('surface-change'));
        surface.element.addEventListener('u2-rte-change', () => events.push('dom-change'));
        surface.transact(() => events.push('change'));
        equal(events, ['surface-before', 'dom-before', 'change', 'surface-change', 'dom-change']);
        core.destroy();
    }
));

test('transaction: canceling beforechange prevents the mutation', () => withFixture(
    '<div contenteditable>text</div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        let changed = false;
        surface.element.addEventListener('u2-rte-beforechange', event => event.preventDefault());
        surface.transact(() => changed = true);
        equal(changed, false);
        core.destroy();
    }
));

test('transaction: dirty nodes are unique and confined to the surface', () => withFixture(`
    <div id=host contenteditable><p>text</p></div><p id=outside>outside</p>
`, root => {
    const core = new Rte(document, {auto: false});
    const surface = core.add(root.querySelector('#host'));
    const transaction = new Transaction(surface);
    const paragraph = surface.element.firstElementChild;
    transaction.touch(paragraph).touch(paragraph);
    equal(transaction.dirty.length, 1);
    same(transaction.dirty[0], paragraph);
    throws(() => transaction.touch(root.querySelector('#outside')), RangeError);
    core.destroy();
}));

test('transaction: restores the saved selection before a command', () => withFixture(
    '<div contenteditable>alpha beta</div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const selection = getSelection();
        selection.setBaseAndExtent(surface.element.firstChild, 0, surface.element.firstChild, 5);
        surface.capture();
        selection.removeAllRanges();
        surface.transact(() => equal(selection.toString(), 'alpha'));
        equal(surface.selection.text, 'alpha');
        equal(surface.transaction, null);
        core.destroy();
    }
));

test('transaction: asynchronous commands fail explicitly and emit an error', () => withFixture(
    '<div contenteditable>text</div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        let error;
        surface.addEventListener('u2-rte-error', event => error = event.detail.error);
        throws(() => surface.transact(() => Promise.resolve()), TypeError);
        truthy(error instanceof TypeError);
        core.destroy();
    }
));
