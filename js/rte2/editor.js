import {Editor} from './src/client/editor.js';
import {rte} from './rte.js';

export {Editor};
export {externalInputs, importLevel} from './src/client/external-input.js';
export {marks} from './src/client/marks.js';
export {structure} from './src/client/structure.js';
export const editor = new Editor(rte);
