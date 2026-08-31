import {editor} from './rte.js';
import {blocks} from './src/client/blocks.js';

export {blocks, blockStyles, defaultBlockStyles} from './src/client/blocks.js';
export {BlockStyles} from './src/command/block-style.js';

editor.add(blocks);
