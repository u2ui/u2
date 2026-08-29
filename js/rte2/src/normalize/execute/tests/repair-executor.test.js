import {RepairExecutor} from '../repair-executor.js';
import {RepairPlanner} from '../../repair/repair-planner.js';
import {PointMap} from '../../../selection/map/point-map.js';
import {Point} from '../../../selection/point/point.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../../tests/harness.js';

test('repair executor: validates execution dependencies and relationships', () => withFixture(
    '<div><p>text</p></div>', root => {
        const host = root.firstElementChild;
        const executor = new RepairExecutor(host);
        throws(() => new RepairExecutor(document), TypeError);
        throws(() => new RepairExecutor(host, {map: {}}), TypeError);
        throws(() => new RepairExecutor(host, {transaction: {}}), TypeError);
        throws(() => executor.apply({}, host, host.firstChild), TypeError);
        throws(() => executor.apply({type: 'remove'}, host, document.createElement('p')), RangeError);
        throws(() => executor.apply({type: 'unknown'}, host, host.firstChild), TypeError);
    }
));

test('repair executor: passive plans leave DOM untouched', () => withFixture(
    '<div><p>text</p></div>', root => {
        const host = root.firstElementChild;
        const executor = new RepairExecutor(host);
        const html = host.innerHTML;
        for (const type of ['keep', 'boundary', 'reject']) equal(executor.apply({type}, host, host.firstChild), false);
        equal(host.innerHTML, html);
    }
));

test('repair executor: wraps an inline run as one mapped operation', () => withFixture(
    '<div>one <strong>two</strong> three</div>', root => {
        const host = root.firstElementChild;
        const edge = new Point(host, 1, 'forward');
        const map = new PointMap([edge]);
        const executor = new RepairExecutor(host, {map});
        executor.wrap([...host.childNodes], 'p');
        equal(host.innerHTML, '<p>one <strong>two</strong> three</p>');
        same(map.get(edge).node, host.firstElementChild);
        equal(map.get(edge).offset, 1);
    }
));

test('repair executor: conversion preserves descendants and mapped points', () => withFixture(
    '<section><div>hello <strong>world</strong></div></section>', root => {
        const host = root.firstElementChild;
        const div = host.firstElementChild;
        const point = new Point(div.firstChild, 3);
        const map = new PointMap([point]);
        const executor = new RepairExecutor(host, {map});
        executor.apply({type: 'convert', tag: 'p'}, host, div);
        equal(host.innerHTML, '<p>hello <strong>world</strong></p>');
        same(map.get(point).node, host.firstElementChild.firstChild);
        equal(map.get(point).offset, 3);
    }
));

test('repair executor: block unwrapping preserves necessary visual boundaries', () => withFixture(
    '<div><p id=paragraph></p></div>', root => {
        const host = root.firstElementChild;
        const paragraph = root.querySelector('#paragraph');
        const block = document.createElement('div');
        block.textContent = 'test';
        paragraph.append(block, ' abc');
        const point = new Point(block.firstChild, 2);
        const map = new PointMap([point]);
        new RepairExecutor(host, {map}).apply({type: 'unwrap', breaks: true}, paragraph, block);
        equal(paragraph.innerHTML, 'test<br> abc');
        same(map.get(point).node, paragraph.firstChild);
        equal(map.get(point).offset, 2);
    }
));

test('repair executor: an isolated unwrapped block needs no break', () => withFixture(
    '<div><p id=paragraph></p></div>', root => {
        const host = root.firstElementChild;
        const paragraph = root.querySelector('#paragraph');
        const block = document.createElement('div');
        block.textContent = 'test';
        paragraph.append(block);
        new RepairExecutor(host).apply({type: 'unwrap', breaks: true}, paragraph, block);
        equal(paragraph.innerHTML, 'test');
    }
));

test('repair executor: lifting splits following wrapper content in order', () => withFixture(
    '<div><p id=paragraph>before</p></div>', root => {
        const host = root.firstElementChild;
        const paragraph = root.querySelector('#paragraph');
        const section = document.createElement('section');
        section.className = 'meaningful';
        section.textContent = 'block';
        paragraph.append(section, 'after');
        const after = paragraph.lastChild;
        const point = new Point(after, 2);
        const map = new PointMap([point]);
        const planner = new RepairPlanner(host, {block: 'p'});
        const plan = planner.plan(paragraph, section);
        new RepairExecutor(host, {map}).apply(plan, paragraph, section);
        equal(host.innerHTML, '<p id="paragraph">before</p><section class="meaningful">block</section><p>after</p>');
        same(map.get(point).node, host.lastElementChild.firstChild);
        equal(map.get(point).offset, 2);
    }
));

test('repair executor: removal maps internal points and touches connected parents', () => withFixture(
    '<div><p>remove</p><p>keep</p></div>', root => {
        const host = root.firstElementChild;
        const removed = host.firstElementChild;
        const point = new Point(removed.firstChild, 3);
        const map = new PointMap([point]);
        const touched = [];
        const executor = new RepairExecutor(host, {map, transaction: {touch: node => touched.push(node)}});
        truthy(executor.apply({type: 'remove'}, host, removed));
        equal(host.innerHTML, '<p>keep</p>');
        same(map.get(point).node, host);
        equal(map.get(point).offset, 0);
        same(touched[0], host);
    }
));
