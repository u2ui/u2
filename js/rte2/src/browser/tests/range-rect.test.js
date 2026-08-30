import {rangeRect} from '../range-rect.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('range rect: validates native ranges and optional ownership roots', () => withFixture(
    '<div id=inside>text</div><div id=outside>other</div>', root => {
        const range = document.createRange();
        range.selectNodeContents(root.querySelector('#inside'));
        throws(() => rangeRect(null), TypeError);
        truthy(rangeRect(range, {root: root.querySelector('#inside')}));
        throws(() => rangeRect(range, {root: root.querySelector('#outside')}), RangeError);
        range.setEnd(root.querySelector('#outside').firstChild, 1);
        throws(() => rangeRect(range, {root: root.querySelector('#inside')}), RangeError);
    }
));

test('range rect: preserves a usable native caret rectangle', () => withFixture(
    '<div>text</div>', root => {
        const range = document.createRange();
        range.setStart(root.firstElementChild.firstChild, 2);
        range.collapse(true);
        const expected = rect(20, 10, 0, 18);
        range.getBoundingClientRect = () => expected;
        same(rangeRect(range), expected);
    }
));

test('range rect: a positioned zero-size caret rectangle is already usable', () => withFixture(
    '<div>text</div>', root => {
        const range = document.createRange();
        range.setStart(root.firstElementChild.firstChild, 2);
        range.collapse(true);
        const expected = rect(20, 10, 0, 0);
        range.getBoundingClientRect = () => expected;
        same(rangeRect(range), expected);
    }
));

test('range rect: empty-block caret positions use either edge of adjacent content', () => withFixture(
    '<p><br></p>', root => {
        const block = root.firstElementChild;
        const filler = block.firstElementChild;
        filler.getBoundingClientRect = () => rect(40, 20, 0, 0);
        for (const offset of [0, 1]) {
            const range = document.createRange();
            range.setStart(block, offset);
            range.collapse(true);
            range.getBoundingClientRect = () => rect(0, 0, 0, 0);
            const result = rangeRect(range, {root: block});
            equal(result.left, 40);
            equal(result.top, 20);
            equal(result.width, 0);
            equal(result.height, 0);
        }
    }
));

test('range rect: falls back through empty wrappers to the owned block', () => withFixture(
    '<p><span></span></p>', root => {
        const block = root.firstElementChild;
        const wrapper = block.firstElementChild;
        wrapper.getBoundingClientRect = () => rect(0, 0, 0, 0);
        block.getBoundingClientRect = () => rect(12, 30, 100, 20);
        const range = document.createRange();
        range.setStart(wrapper, 0);
        range.collapse(true);
        range.getBoundingClientRect = () => rect(0, 0, 0, 0);
        const result = rangeRect(range, {root: block});
        equal(result.left, 12);
        equal(result.top, 30);
        equal(result.height, 20);
    }
));

function rect(left, top, width, height) {
    return DOMRect.fromRect({x: left, y: top, width, height});
}
