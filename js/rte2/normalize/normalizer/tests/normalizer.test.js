import {Normalizer} from '../normalizer.js';
import {EditRange} from '../../../selection/range/edit-range.js';
import {Point} from '../../../selection/point/point.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('normalizer: validates roots, scopes, planners, and operation limits', () => withFixture(
    '<div><section></section><section contenteditable></section></div>', root => {
        const host = root.firstElementChild;
        const normalizer = new Normalizer(host, {block: 'p'});
        throws(() => new Normalizer(document), TypeError);
        throws(() => new Normalizer(host, {planner: {plan() {}}}), TypeError);
        throws(() => new Normalizer(host, {limit: 0}), RangeError);
        throws(() => normalizer.normalize({scope: root}), RangeError);
        throws(() => normalizer.normalize({scope: host.lastElementChild}), RangeError);
    }
));

test('normalizer: adjacent inline root content becomes one block', () => withFixture(
    '<div>one <strong>two</strong> three</div>', root => {
        const host = root.firstElementChild;
        const result = new Normalizer(host, {block: 'p'}).normalize();
        equal(host.innerHTML, '<p>one <strong>two</strong> three</p>');
        truthy(result.changed);
        truthy(result.stable);
        equal(result.actions.length, 1);
        equal(result.actions[0].count, 3);
        truthy(result.passes >= 2);
    }
));

test('normalizer: step uses normal grouping but executes only one operation', () => withFixture(
    '<div>inline <strong>run</strong><div>block</div></div>', root => {
        const host = root.firstElementChild;
        const normalizer = new Normalizer(host, {block: 'p'});
        const first = normalizer.step();
        equal(first.actions.length, 1);
        equal(first.actions[0].count, 2);
        equal(first.stable, false);
        equal(host.innerHTML, '<p>inline <strong>run</strong></p><div>block</div>');
        const second = normalizer.step();
        equal(second.actions[0].type, 'convert');
        equal(host.innerHTML, '<p>inline <strong>run</strong></p><p>block</p>');
        truthy(normalizer.step().stable);
    }
));

test('normalizer: formatting whitespace stays inside one inline run', () => withFixture(
    '<div><span>one</span> \n <strong>two</strong></div>', root => {
        const host = root.firstElementChild;
        new Normalizer(host, {block: 'p'}).normalize();
        equal(host.innerHTML, '<p><span>one</span> \n <strong>two</strong></p>');
    }
));

test('normalizer: nested block content is unwrapped with a line boundary', () => withFixture(
    '<div><p id=paragraph></p></div>', root => {
        const host = root.firstElementChild;
        const paragraph = root.querySelector('#paragraph');
        const block = document.createElement('div');
        block.textContent = 'test';
        paragraph.append(block, ' abc');
        new Normalizer(host, {block: 'p'}).normalize();
        equal(host.innerHTML, '<p id="paragraph">test<br> abc</p>');
    }
));

test('normalizer: generic text blocks convert to the configured root block', () => withFixture(
    '<section><div>hello</div></section>', root => {
        const host = root.firstElementChild;
        new Normalizer(host, {block: 'p'}).normalize();
        equal(host.innerHTML, '<p>hello</p>');
    }
));

test('normalizer: redundant generic wrappers around blocks disappear', () => withFixture(
    '<section><div><p>one</p><p>two</p></div></section>', root => {
        const host = root.firstElementChild;
        new Normalizer(host, {block: 'p'}).normalize();
        equal(host.innerHTML, '<p>one</p><p>two</p>');
    }
));

test('normalizer: the combined p and div regression reaches canonical structure', () => withFixture(
    '<div><p id=paragraph></p><div>hallo</div></div>', root => {
        const host = root.firstElementChild;
        const paragraph = root.querySelector('#paragraph');
        const block = document.createElement('div');
        block.textContent = 'test';
        paragraph.append(block, ' abc');
        new Normalizer(host, {block: 'p'}).normalize();
        equal(host.innerHTML, '<p id="paragraph">test<br> abc</p><p>hallo</p>');
    }
));

test('normalizer: list roots group stray flow content into list items', () => withFixture(
    '<ul><p>one</p><p>two</p></ul>', root => {
        const list = root.firstElementChild;
        new Normalizer(list, {block: 'li'}).normalize();
        equal(list.innerHTML, '<li><p>one</p></li><li><p>two</p></li>');
    }
));

test('normalizer: mapped range endpoints survive combined repairs', () => withFixture(
    '<div contenteditable><p id=paragraph></p><div>hallo</div></div>', root => {
        const host = root.firstElementChild;
        const paragraph = root.querySelector('#paragraph');
        const block = document.createElement('div');
        block.textContent = 'test';
        paragraph.append(block, ' abc');
        const start = new Point(block.firstChild, 1);
        const end = new Point(host.lastElementChild.firstChild, 4);
        const result = new Normalizer(host, {block: 'p'}).normalize({points: [start, end]});
        const range = EditRange.fromPoints(result.map.get(start), result.map.get(end), host);
        equal(range.text, 'est abchall');
        same(range.start.node, paragraph.firstChild);
        same(range.end.node, host.lastElementChild.firstChild);
    }
));

test('normalizer: local scope leaves sibling subtrees untouched', () => withFixture(
    '<div><p id=one></p><p id=two></p></div>', root => {
        const host = root.firstElementChild;
        for (const paragraph of host.children) {
            const block = document.createElement('div');
            block.textContent = paragraph.id;
            paragraph.append(block);
        }
        new Normalizer(host, {block: 'p'}).normalize({scope: host.firstElementChild});
        equal(host.firstElementChild.innerHTML, 'one');
        equal(host.lastElementChild.innerHTML, '<div>two</div>');
    }
));

test('normalizer: nested editors are untouched', () => withFixture(
    '<div><div contenteditable><div>nested</div></div><div>outer</div></div>', root => {
        const host = root.firstElementChild;
        const nested = host.firstElementChild;
        new Normalizer(host, {block: 'p'}).normalize();
        equal(nested.innerHTML, '<div>nested</div>');
        equal(host.lastElementChild.outerHTML, '<p>outer</p>');
    }
));

test('normalizer: unresolved lossless repairs are reported', () => withFixture(
    '<p></p>', root => {
        const host = root.firstElementChild;
        host.append(document.createElement('hr'));
        const result = new Normalizer(host, {block: null}).normalize();
        equal(result.changed, false);
        equal(result.issues.length, 1);
        same(result.issues[0].node, host.firstElementChild);
    }
));

test('normalizer: a stable second run performs no actions', () => withFixture(
    '<div><div>hello</div></div>', root => {
        const normalizer = new Normalizer(root.firstElementChild, {block: 'p'});
        truthy(normalizer.normalize().changed);
        const second = normalizer.normalize();
        equal(second.changed, false);
        truthy(second.stable);
        equal(second.actions, []);
        equal(second.passes, 1);
    }
));

test('normalizer: operation limits expose non-converging or oversized work', () => withFixture(
    '<div><div>one</div><div>two</div></div>', root => {
        throws(() => new Normalizer(root.firstElementChild, {block: 'p', limit: 1}).normalize(), RangeError);
    }
));

test('normalizer: a root block that is also a generic wrapper reaches a fixed point', () => withFixture(
    '<div>hello<div>world</div><div><p>block</p></div></div>', root => {
        const host = root.firstElementChild;
        const result = new Normalizer(host, {block: 'div'}).normalize();
        equal(host.innerHTML, '<div>hello</div><div>world</div><p>block</p>');
        truthy(result.stable);
    }
));

test('normalizer: an inline-only host keeps phrasing content and its separating whitespace', () => withFixture(
    '<p><em>one</em> <em>two</em></p>', root => {
        const host = root.firstElementChild;
        const result = new Normalizer(host, {block: 'p'}).normalize();
        equal(host.innerHTML, '<em>one</em> <em>two</em>');
        equal(result.changed, false);
        truthy(result.stable);
    }
));
