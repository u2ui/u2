import {Commands} from '../commands.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

const noop = {run: () => 'done'};

test('commands: validate their surface, names, and command shape', () => withSurface(
    '<div contenteditable>text</div>', ({surface}) => {
        throws(() => new Commands(null), TypeError);
        throws(() => new Commands(surface, {model: {}}), TypeError);
        const commands = new Commands(surface);
        throws(() => commands.add('', noop), TypeError);
        throws(() => commands.add('broken', {}), TypeError);
        throws(() => commands.add('broken', {run: () => {}, enabled: true}), TypeError);
        throws(() => commands.add('broken', {run: () => {}, state: true}), TypeError);
        throws(() => commands.add('broken', {run: () => {}, transaction: 'no'}), TypeError);
        throws(() => commands.run('missing'), RangeError);
        equal(commands.get('missing'), null);
        equal(commands.has('missing'), false);
    }
));

test('commands: CSS element policy narrows the current model on demand', () => withSurface(
    '<div contenteditable style="--u2-rte-elements:p"><p>text</p></div>', ({surface}) => {
        const commands = new Commands(surface);
        equal(commands.model.allowed('p'), true);
        equal(commands.model.allowed('h1'), false);
        const first = commands.model;
        same(commands.model, first);
        surface.element.style.setProperty('--u2-rte-elements', 'p h1');
        surface.invalidate(); // the reading stands until the surface is told to take another
        equal(commands.model.allowed('h1'), true);
    }
));

test('commands: state is a pure optional query over the current edit', () => withSurface(
    '<div contenteditable>text</div>', ({surface, host}) => {
        let changed = 0;
        host.addEventListener('u2-rte-change', () => changed++);
        const commands = new Commands(surface, {commands: {
            noop,
            mark: {run: () => {}, state: edit => edit.range?.text ?? null},
            never: {enabled: () => false, run: () => {}, state: () => 'hidden'},
        }});
        equal(commands.state('missing'), null);
        equal(commands.state('noop'), null);
        equal(commands.state('mark'), null);
        getSelection().selectAllChildren(host);
        equal(commands.state('mark'), 'text');
        equal(commands.enabled('never'), false);
        equal(commands.state('never'), 'hidden', 'State is independent from command availability');
        equal(changed, 0);
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
        same(events[0][1].transaction, seen.transaction);
        equal(events[1][1].trigger, 'command');
        equal(events[1][1].command, 'mark');
    }
));

test('commands: view actions can run without an editing transaction', () => withSurface(
    '<div contenteditable>text</div>', ({surface, host}) => {
        const events = [];
        host.addEventListener('u2-rte-command', event => events.push([event.type, event.detail.transaction]));
        host.addEventListener('u2-rte-beforechange', event => events.push(event.type));
        host.addEventListener('u2-rte-change', event => events.push(event.type));
        let edit;
        const commands = new Commands(surface, {commands: {view: {
            transaction: false,
            run(value) {
                edit = value;
                return 'visible';
            },
        }}});
        getSelection().selectAllChildren(host);
        equal(commands.run('view'), 'visible');
        equal(edit.transaction, null);
        equal(events, [['u2-rte-command', null]]);
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
        core.dispose();
    }
));

function withSurface(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        try {
            return run({core, surface: core.add(host), host, root});
        } finally {
            core.dispose();
        }
    });
}

test('commands: shortcuts are parsed, canonical, and reversible', () => withFixture(
    '<div contenteditable><p>one</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const commands = new Commands(surface);
        commands.add('bold', {shortcut: 'shift+ctrl+B', run() {}});
        commands.add('redo', {shortcut: 'ctrl+y ctrl+shift+z', run() {}});
        equal([...commands.keys.keys()], ['ctrl+shift+b', 'ctrl+y', 'ctrl+shift+z']);
        equal(commands.shortcut(key({ctrlKey: true, shiftKey: true, key: 'B'})), 'bold');
        equal(commands.shortcut(key({metaKey: true, key: 'y'})), 'redo', 'Command counts as Ctrl');
        equal(commands.shortcut(key({ctrlKey: true, key: 'b'})), null, 'A missing modifier is a different chord');
        commands.delete('redo');
        equal([...commands.keys.keys()], ['ctrl+shift+b']);
        throws(() => commands.add('bad', {shortcut: 'ctrl+', run() {}}), TypeError);
        throws(() => commands.add('bad', {shortcut: 'meta+b', run() {}}), TypeError);
        throws(() => commands.add('bad', {shortcut: '', run() {}}), TypeError);
        equal(commands.has('bad'), false, 'A rejected shortcut leaves no command behind');
        core.dispose();
    }
));

test('commands: a shifted digit is the same chord on every layout', () => withFixture(
    '<div contenteditable><p>one</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const commands = new Commands(surface, {commands: {bullets: {shortcut: 'ctrl+shift+8', run() {}}}});
        equal(commands.shortcut(key({ctrlKey: true, shiftKey: true, key: '(', code: 'Digit8'})), 'bullets');
        equal(commands.shortcut(key({ctrlKey: true, shiftKey: true, key: '8', code: 'Digit8'})), 'bullets');
        core.dispose();
    }
));

function key(init) {
    return new KeyboardEvent('keydown', init);
}
