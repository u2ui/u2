import {Point} from '../point.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../../tests/harness.js';

test('point: validates nodes, offsets, and affinity', () => withFixture(
    '<div>abc</div>', root => {
        const text = root.firstElementChild.firstChild;
        throws(() => new Point(null, 0), TypeError);
        throws(() => new Point(text, -1), RangeError);
        throws(() => new Point(text, 4), RangeError);
        throws(() => new Point(text, 1.5), RangeError);
        throws(() => new Point(text, 0, 'left'), TypeError);
    }
));

test('point: creates explicit text and element boundaries', () => withFixture(
    '<div><b>one</b><i>two</i></div>', root => {
        const host = root.firstElementChild;
        const text = host.firstElementChild.firstChild;
        const start = Point.start(text);
        const end = Point.end(text);
        equal(start.offset, 0);
        equal(start.affinity, 'forward');
        equal(end.offset, 3);
        equal(end.affinity, 'backward');
        equal(Point.start(host).offset, 0);
        equal(Point.end(host).offset, 2);
    }
));

test('point: creates boundaries before and after a node', () => withFixture(
    '<div><b>one</b><i>two</i></div>', root => {
        const host = root.firstElementChild;
        const italic = host.lastElementChild;
        const before = Point.before(italic);
        const after = Point.after(italic);
        same(before.node, host);
        equal(before.offset, 1);
        equal(before.affinity, 'backward');
        equal(after.offset, 2);
        equal(after.affinity, 'forward');
        throws(() => Point.before(document.createElement('i')), RangeError);
    }
));

test('point: reads range edges with deliberate affinity', () => withFixture(
    '<div>alpha</div>', root => {
        const text = root.firstElementChild.firstChild;
        const range = document.createRange();
        range.setStart(text, 1);
        range.setEnd(text, 4);
        equal(Point.fromRange(range, 'start').offset, 1);
        equal(Point.fromRange(range, 'start').affinity, 'forward');
        equal(Point.fromRange(range, 'end').offset, 4);
        equal(Point.fromRange(range, 'end').affinity, 'backward');
        throws(() => Point.fromRange(range, 'middle'), TypeError);
    }
));

test('point: compares boundaries without considering affinity', () => withFixture(
    '<div>alpha</div>', root => {
        const text = root.firstElementChild.firstChild;
        const one = new Point(text, 1);
        const two = new Point(text, 2);
        equal(one.compare(two), -1);
        equal(two.compare(one), 1);
        equal(one.compare(one.withAffinity('backward')), 0);
        throws(() => one.compare({}), TypeError);
    }
));

test('point: a native live range follows splitText', () => withFixture(
    '<div>alpha</div>', root => {
        const text = root.firstElementChild.firstChild;
        const point = new Point(text, 4);
        const right = text.splitText(2);
        same(point.node, right);
        equal(point.offset, 2);
    }
));

test('point: a native live range survives removal of its container', () => withFixture(
    '<div><b>one</b><i>two</i></div>', root => {
        const host = root.firstElementChild;
        const bold = host.firstElementChild;
        const point = new Point(bold.firstChild, 2);
        bold.remove();
        same(point.node, host);
        equal(point.offset, 0);
        truthy(point.within(host));
    }
));

test('point: returned ranges and clones do not mutate the stored point', () => withFixture(
    '<div>alpha</div>', root => {
        const text = root.firstElementChild.firstChild;
        const point = new Point(text, 2, 'backward');
        const range = point.range();
        range.setStart(text, 0);
        const clone = point.clone();
        equal(point.offset, 2);
        equal(clone.offset, 2);
        equal(clone.affinity, 'backward');
    }
));

test('point: reports native relocation when its node is removed', () => withFixture(
    '<div id=one>one</div><div id=two>two</div>', root => {
        const one = root.querySelector('#one');
        const two = root.querySelector('#two');
        const text = one.firstChild;
        const point = Point.start(text);
        truthy(point.within(one));
        equal(point.within(two), false);
        text.remove();
        same(point.node, one);
        truthy(point.within(one));
    }
));
