import {editor} from './editor.js';
import {link} from './src/client/link.js';

export {link, linkEditor} from './src/client/link.js';
export {linkHtml} from './src/mark/standard.js';
export {valueMark} from './src/command/mark.js';

editor.add(link);
