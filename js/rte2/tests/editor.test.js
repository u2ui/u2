import {Editor, editor, externalInputs, importLevel} from '../editor.js';
import {rte} from '../rte.js';
import {same, test, truthy} from './harness.js';

test('editor entry: one import creates the default convention client', () => {
    truthy(editor instanceof Editor);
    same(editor.core, rte);
    truthy(typeof externalInputs === 'function');
    truthy(typeof importLevel === 'function');
});
