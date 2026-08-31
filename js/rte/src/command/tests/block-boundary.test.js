import {blockEdge, emptyBlock} from '../block-boundary.js';
import {Point} from '../../selection/point/point.js';
import {htmlModel} from '../../model/html/html-model.js';
import {equal, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('block boundary: filler, whitespace, and empty wrappers are editor-empty', () => withFixture(
    '<p> <span><br></span><!--ignored--></p>', root => {
        truthy(emptyBlock(root.firstElementChild, htmlModel));
    }
));

test('block boundary: atomic content and nested editing boundaries are meaningful', () => withFixture(
    '<p id=atomic><img alt=""></p><p id=nested><span contenteditable></span></p>', root => {
        equal(emptyBlock(root.querySelector('#atomic'), htmlModel), false);
        equal(emptyBlock(root.querySelector('#nested'), htmlModel), false);
    }
));

test('block boundary: nested points resolve exact leading and trailing edges', () => withFixture(
    '<p><span>text</span></p>', root => {
        const block = root.firstElementChild;
        const text = block.firstElementChild.firstChild;
        truthy(blockEdge(block, new Point(text, 0), 'start'));
        truthy(blockEdge(block, new Point(text, 4), 'end'));
        equal(blockEdge(block, new Point(text, 1), 'start'), false);
        equal(blockEdge(block, new Point(text, 3), 'end'), false);
        equal(blockEdge(document.createElement('p'), new Point(text, 0), 'start'), false);
        throws(() => blockEdge(block, new Point(text, 0), 'middle'), TypeError);
    }
));
