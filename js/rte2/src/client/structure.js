import {insertNode} from '../command/insert.js';
import {Lists} from '../command/list.js';

// Block structure as one convention module: lists, their nesting level, and a
// separator. All of them consult the content model, so a host that does not
// allow a list or a rule simply keeps the control disabled.
const lists = new Lists(['ul', 'ol']);

export const structure = Object.freeze({
    name: 'structure',
    commands: () => ({
        bullets: lists.toggle('ul'),
        numbers: lists.toggle('ol'),
        indent: lists.indent,
        outdent: lists.outdent,
        rule: insertNode(document => document.createElement('hr')),
    }),
    toolbar: Object.freeze([
        Object.freeze({command: 'bullets', label: 'Bulleted list', text: '•–', state: true}),
        Object.freeze({command: 'numbers', label: 'Numbered list', text: '1–', state: true}),
        Object.freeze({command: 'outdent', label: 'Decrease level', text: '⇤'}),
        Object.freeze({command: 'indent', label: 'Increase level', text: '⇥'}),
        Object.freeze({command: 'rule', label: 'Separator', text: '―'}),
    ]),
});
