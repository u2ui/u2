import {editor} from './rte.js';
import {tables} from './src/client/tables.js';

export {tables, tableTools} from './src/client/tables.js';
export {Tables} from './src/command/table.js';

editor.add(tables);
