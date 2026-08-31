import {blocks, BlockStyles, blockStyles, defaultBlockStyles} from '../blocks.js';
import {editor} from '../rte.js';
import {rte} from '../rte.js';
import {test, truthy, withFixture} from './harness.js';

test('blocks entry: one optional import extends the default convention client', () => withFixture(
    '<div contenteditable><p>text</p></div>', root => {
        truthy(blocks);
        truthy(BlockStyles);
        truthy(blockStyles);
        truthy(defaultBlockStyles);
        const surface = rte.add(root.firstElementChild);
        truthy(editor.commands(surface).has('blockStyle'));
        rte.delete(surface);
    }
));
