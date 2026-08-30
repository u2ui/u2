import {editor} from './editor.js';
import {sourceView} from './src/client/source.js';

export {sourceView} from './src/client/source.js';
export {Source} from './src/source/source.js';

// Syntax highlighting is an enhancement: the dialog wraps its text area in
// <u2-code> and works without it. This entry loads that element on first use,
// so the composable `sourceView()` stays free of any dependency.
export const source = sourceView({highlight: () => import('../../el/code/code.js')});

editor.add(source);
