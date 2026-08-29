import {MarkAdapter} from './dom-adapter.js';
import {MarkType} from './mark.js';

export const bold = new MarkType('bold');

export const boldHtml = new MarkAdapter(bold, {
    selector: 'strong, b',
    tag: 'strong',
    clear: () => true,
});
