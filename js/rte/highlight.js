import {editor} from './rte.js';
import {highlight} from './src/client/marks.js';

export {highlight} from './src/client/marks.js';
export {highlightHtml} from './src/mark/standard.js';

editor.add(highlight);
