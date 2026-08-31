import {editor} from './rte.js';
import {images} from './src/client/images.js';

export {images, imageTools} from './src/client/images.js';
export {elementAttributes, selectedElement} from './src/command/element.js';

editor.add(images);
