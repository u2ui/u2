import {editor} from './editor.js';
import {unstyle} from './src/client/unstyle.js';

export {unstyle, unstyles} from './src/client/unstyle.js';
export {unstyleCommand} from './src/command/unstyle.js';
export {Unstyle, defaultUnstyle, defaultUnstyleLevels} from './src/unstyle/unstyle.js';

editor.add(unstyle);
