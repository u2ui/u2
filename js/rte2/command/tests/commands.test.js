import {Commands} from '../commands.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../tests/harness.js';

const noop = {run: () => 'done'};

test('commands: validate their surface, names, and command shape', () => withSurface(
    '<div contenteditable>text</div>', ({surface}) => {
        throws(() => new Commands(null), TypeError);
        const commands = new Commands(surface);
        throws(() => commands.add('', noop), TypeError);
        throws(() => commands.add('broken', {}), TypeError);
        throws(() => commands.add('broken', {run: () => {}, enabled: true}), TypeError);
        throws(() => commands.run('missing'), RangeError);
        equal(commands.get('missing'), null);
        equal(commands.has('missing'), false);
    }
));

test('commands: registration indexes input types and stays reversible', () => withSurface(
    '<div contenteditable>text</div>', ({surface}) => {
        const commands = new Commands(surface, {commands: {noop}});
        commands.add('split', {inputTypes: ['insertParagraph', 'insertLineBreak'], run: () => {}});
        equal(commands.names, ['noop', 'split']);
        equal(commands.input('insertParagraph'), 'split');
        commands.add('split', {inputTypes: ['insertParagraph'], run: () => {}});
        equal(commands.input('insertLineBreak'), null, 'Re-registration must drop stale input types');
        truthy(commands.delete('split'));
        equal(commands.delete('split'), false);
        equal(commands.input('insertParagraph'), null);
        equal(commands.names, ['noop']);
    }
));

test('commands: availability defaults to an owned range and can be overridden', () => withSurface(
    '<div contenteditable>text</div>', ({surface, host}) => {
        const commands = new Commands(surface, {commands: {noop, never: {enabled: () => false, run: () => {}}}});
        equal(commands.enabled('noop'), false, 'Without a selection there is nothing to act on');
        getSelection().selectAllChildren(host);
        equal(commands.enabled('noop'), true);
        equal(commands.enabled('never'), false);
        equal(commands.enabled('missing'), false);
    }
));

test('commands: run wraps one transaction, reports metadata, and returns the result', () => withSurface(
    '<div contenteditable>text</div>', ({surface, host}) => {
        const events = [];
        let seen = null;
        host.addEventListener('u2-rte-change', event => events.push(['change', event.detail.transaction.options]));
        host.addEventListener('u2-rte-command', event => events.push(['command', event.detail]));
        const commands = new Commands(surface, {commands: {mark: {
            run(edit) {
                seen = edit;
                edit.transaction.touch(host);
                return 'marked';
            },
        }}});
        getSelection().selectAllChildren(host);
        equal(commands.run('mark', {inputType: 'formatBold'}), 'marked');
        same(seen.surface, surface);
        same(seen.transaction.surface, surface);
        equal(events.map(([type]) => type), ['command', 'change'], 'The command event belongs to its transaction');
        equal(events[0][1].name, 'mark');
        equal(events[0][1].inputType, 'formatBold');
        equal(events[0][1].result, 'marked');
        equal(events[1][1].trigger, 'command');
        equal(events[1][1].command, 'mark');
    }
));

test('commands: an unavailable command neither runs nor opens a transaction', () => withSurface(
    '<div contenteditable>text</div>', ({surface, host}) => {
        let changed = 0;
        let ran = 0;
        host.addEventListener('u2-rte-change', () => changed++);
        const commands = new Commands(surface, {commands: {mark: {run: () => ran++}}});
        equal(commands.run('mark'), undefined);
        equal(ran, 0);
        equal(changed, 0);
    }
));

test('commands: a canceled transaction stops the command', () => withSurface(
    '<div contenteditable>text</div>', ({surface, host}) => {
        let ran = 0;
        host.addEventListener('u2-rte-beforechange', event => event.preventDefault());
        const commands = new Commands(surface, {commands: {mark: {run: () => ran++}}});
        getSelection().selectAllChildren(host);
        equal(commands.run('mark'), undefined);
        equal(ran, 0);
    }
));

test('commands: registries stay isolated per surface', () => withFixture(
    '<div id=one contenteditable>one</div><div id=two contenteditable>two</div>', root => {
        const core = new Rte(document, {auto: false});
        const one = new Commands(core.add(root.querySelector('#one')), {commands: {noop}});
        const two = new Commands(core.add(root.querySelector('#two')));
        equal(one.names, ['noop']);
        equal(two.names, []);
        core.destroy();
    }
));

function withSurface(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        try {
            return run({core, surface: core.add(host), host, root});
        } finally {
            core.destroy();
        }
    });
}
