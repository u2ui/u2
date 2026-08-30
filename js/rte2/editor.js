import {Editor} from './src/client/editor.js';
import {rte} from './rte.js';

export {Editor};
export {externalInputs, importLevel} from './src/client/external-input.js';
export const editor = new Editor(rte);
