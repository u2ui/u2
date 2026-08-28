import {PointMap} from '../point-map.js';
import {Point} from '../../point/point.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('point map: tracks snapshots and returns independent points', () => withFixture(
    '<div>abc</div>', root => {
        const text = root.firstElementChild.firstChild;
        const point = new Point(text, 1, 'backward');
        const map = new PointMap().add(point).add(point);
        truthy(map.has(point));
        equal(map.has(new Point(text, 1)), false);
        const mapped = map.get(point);
        same(mapped.node, text);
        equal(mapped.offset, 1);
        equal(mapped.affinity, 'backward');
        throws(() => map.add({}), TypeError);
        throws(() => map.get(new Point(text, 1)), RangeError);
    }
));

test('point map: insertion resolves equal boundaries by affinity', () => withFixture(
    '<div><i>one</i></div>', root => {
        const host = root.firstElementChild;
        const backward = new Point(host, 0, 'backward');
        const forward = new Point(host, 0, 'forward');
        const after = new Point(host, 1);
        const map = new PointMap([backward, forward, after]);
        const bold = document.createElement('b');
        map.insert(host, 0, bold);
        equal(host.innerHTML, '<b></b><i>one</i>');
        equal(map.get(backward).offset, 0);
        equal(map.get(forward).offset, 1);
        equal(map.get(after).offset, 2);
        throws(() => map.insert(host, 4, document.createElement('u')), RangeError);
        throws(() => map.insert(host, 0, bold), RangeError);
        throws(() => map.insert(host, 0, document.createDocumentFragment()), TypeError);
    }
));

test('point map: text splitting maps both affinities and parent offsets', () => withFixture(
    '<div>alpha<i>end</i></div>', root => {
        const host = root.firstElementChild;
        const text = host.firstChild;
        const before = new Point(text, 2, 'backward');
        const after = new Point(text, 2, 'forward');
        const tail = new Point(text, 4);
        const parent = new Point(host, 1);
        const map = new PointMap([before, after, tail, parent]);
        const right = map.splitText(text, 2);
        equal([...host.childNodes].map(node => node.textContent), ['al', 'pha', 'end']);
        same(map.get(before).node, text);
        equal(map.get(before).offset, 2);
        same(map.get(after).node, right);
        equal(map.get(after).offset, 0);
        same(map.get(tail).node, right);
        equal(map.get(tail).offset, 2);
        equal(map.get(parent).offset, 2);
        throws(() => map.splitText(host, 0), TypeError);
        throws(() => map.splitText(text, 3), RangeError);
    }
));

test('point map: wrapping maps outer edges and inner sibling boundaries', () => withFixture(
    '<div><i>a</i><i>b</i><i>c</i><i>d</i></div>', root => {
        const host = root.firstElementChild;
        const children = [...host.children];
        const startBack = new Point(host, 1, 'backward');
        const startForward = new Point(host, 1, 'forward');
        const middle = new Point(host, 2);
        const endBack = new Point(host, 3, 'backward');
        const endForward = new Point(host, 3, 'forward');
        const after = new Point(host, 4);
        const map = new PointMap([startBack, startForward, middle, endBack, endForward, after]);
        const wrapper = document.createElement('strong');
        map.wrap(children.slice(1, 3), wrapper);
        equal(host.innerHTML, '<i>a</i><strong><i>b</i><i>c</i></strong><i>d</i>');
        same(map.get(startBack).node, host);
        equal(map.get(startBack).offset, 1);
        same(map.get(startForward).node, wrapper);
        equal(map.get(startForward).offset, 0);
        same(map.get(middle).node, wrapper);
        equal(map.get(middle).offset, 1);
        same(map.get(endBack).node, wrapper);
        equal(map.get(endBack).offset, 2);
        same(map.get(endForward).node, host);
        equal(map.get(endForward).offset, 2);
        equal(map.get(after).offset, 3);
    }
));

test('point map: wrapping rejects non-contiguous and stateful wrappers', () => withFixture(
    '<div><i>a</i><i>b</i><i>c</i></div>', root => {
        const host = root.firstElementChild;
        const children = [...host.children];
        const wrapper = document.createElement('strong');
        wrapper.textContent = 'occupied';
        const map = new PointMap();
        throws(() => map.wrap([], document.createElement('strong')), RangeError);
        throws(() => map.wrap([children[0], children[2]], document.createElement('strong')), RangeError);
        throws(() => map.wrap([children[0]], wrapper), RangeError);
    }
));

test('point map: unwrapping expands wrapper and parent boundaries', () => withFixture(
    '<div><i>a</i><strong><b>b</b><b>c</b></strong><i>d</i></div>', root => {
        const host = root.firstElementChild;
        const wrapper = host.children[1];
        const inside = new Point(wrapper, 1);
        const after = new Point(host, 2);
        const descendant = new Point(wrapper.firstElementChild.firstChild, 1);
        const map = new PointMap([inside, after, descendant]);
        map.unwrap(wrapper);
        equal(host.innerHTML, '<i>a</i><b>b</b><b>c</b><i>d</i>');
        same(map.get(inside).node, host);
        equal(map.get(inside).offset, 2);
        equal(map.get(after).offset, 3);
        same(map.get(descendant).node, host.children[1].firstChild);
        throws(() => map.unwrap(wrapper), RangeError);
    }
));

test('point map: subtree replacement collapses internal points by affinity', () => withFixture(
    '<div><b>one</b><i>two</i></div>', root => {
        const host = root.firstElementChild;
        const bold = host.firstElementChild;
        const backward = new Point(bold.firstChild, 2, 'backward');
        const forward = new Point(bold.firstChild, 2, 'forward');
        const before = new Point(host, 0);
        const after = new Point(host, 1);
        const map = new PointMap([backward, forward, before, after]);
        map.replace(bold, document.createElement('u'));
        equal(host.innerHTML, '<u></u><i>two</i>');
        same(map.get(backward).node, host);
        equal(map.get(backward).offset, 0);
        equal(map.get(forward).offset, 1);
        equal(map.get(before).offset, 0);
        equal(map.get(after).offset, 1);
    }
));

test('point map: wrapper replacement preserves contents and exact points', () => withFixture(
    '<div><div>one <b>two</b></div></div>', root => {
        const host = root.firstElementChild;
        const old = host.firstElementChild;
        const wrapperPoint = new Point(old, 1);
        const textPoint = new Point(old.firstChild, 2);
        const map = new PointMap([wrapperPoint, textPoint]);
        const paragraph = document.createElement('p');
        map.replaceWrapper(old, paragraph);
        equal(host.innerHTML, '<p>one <b>two</b></p>');
        same(map.get(wrapperPoint).node, paragraph);
        equal(map.get(wrapperPoint).offset, 1);
        same(map.get(textPoint).node, paragraph.firstChild);
        equal(map.get(textPoint).offset, 2);
        throws(() => map.replaceWrapper(paragraph, document.createTextNode('x')), TypeError);
    }
));

test('point map: moving follows affinity-bound edges across parents', () => withFixture(
    '<div id=one><i>a</i><b>b</b><u>c</u></div><div id=two><em>d</em></div>', root => {
        const one = root.querySelector('#one');
        const two = root.querySelector('#two');
        const bold = one.children[1];
        const beforeBack = new Point(one, 1, 'backward');
        const beforeForward = new Point(one, 1, 'forward');
        const afterBack = new Point(one, 2, 'backward');
        const afterForward = new Point(one, 2, 'forward');
        const destinationBack = new Point(two, 0, 'backward');
        const destinationForward = new Point(two, 0, 'forward');
        const content = new Point(bold.firstChild, 1);
        const points = [beforeBack, beforeForward, afterBack, afterForward, destinationBack, destinationForward, content];
        const map = new PointMap(points);
        map.move(bold, two, 0);
        equal(one.innerHTML, '<i>a</i><u>c</u>');
        equal(two.innerHTML, '<b>b</b><em>d</em>');
        same(map.get(beforeForward).node, two);
        equal(map.get(beforeForward).offset, 0);
        equal(map.get(afterBack).offset, 1);
        equal(map.get(beforeBack).offset, 1);
        equal(map.get(afterForward).offset, 1);
        equal(map.get(destinationBack).offset, 0);
        equal(map.get(destinationForward).offset, 1);
        same(map.get(content).node, bold.firstChild);
    }
));

test('point map: text merging maps right text and shared boundary', () => withFixture(
    '<div>one<!--gap-->two<i>end</i></div>', root => {
        const host = root.firstElementChild;
        const left = host.firstChild;
        host.childNodes[1].remove();
        const right = host.childNodes[1];
        const inRight = new Point(right, 2);
        const between = new Point(host, 1);
        const after = new Point(host, 2);
        const map = new PointMap([inRight, between, after]);
        map.mergeText(left, right);
        equal(host.innerHTML, 'onetwo<i>end</i>');
        same(map.get(inRight).node, left);
        equal(map.get(inRight).offset, 5);
        same(map.get(between).node, left);
        equal(map.get(between).offset, 3);
        same(map.get(after).node, host);
        equal(map.get(after).offset, 1);
        throws(() => map.mergeText(left, host.lastChild), TypeError);
    }
));

test('point map: removal relocates descendants and following boundaries', () => withFixture(
    '<div><i>a</i><b>b<u>c</u></b><em>d</em></div>', root => {
        const host = root.firstElementChild;
        const bold = host.children[1];
        const nested = new Point(bold.lastElementChild.firstChild, 1);
        const before = new Point(host, 1);
        const after = new Point(host, 2);
        const end = new Point(host, 3);
        const map = new PointMap([nested, before, after, end]);
        map.remove(bold);
        equal(host.innerHTML, '<i>a</i><em>d</em>');
        same(map.get(nested).node, host);
        equal(map.get(nested).offset, 1);
        equal(map.get(before).offset, 1);
        equal(map.get(after).offset, 1);
        equal(map.get(end).offset, 2);
        throws(() => map.remove(bold), RangeError);
    }
));
