export {aiView} from './src/client/ai.js';

// No `editor.add()` here: an assistant needs a request function, and which model answers is the
// application's choice — `editor.add(aiView({request}))` is the whole setup.
