import {insertNode} from '../command/insert.js';
import {Lists} from '../command/list.js';

// Block structure as one convention module: lists, their nesting level, and a
// separator. All of them consult the content model, so a host that does not
// allow a list or a rule simply keeps the control disabled.
const lists = new Lists(['ul', 'ol']);

export const structure = Object.freeze({
    name: 'structure',
    // Tab and Shift+Tab only ever reach the nesting commands where those are
    // available, so outside a list they keep moving focus as they should.
    commands: () => ({
        bullets: {...lists.toggle('ul'), shortcut: 'ctrl+shift+8'},
        numbers: {...lists.toggle('ol'), shortcut: 'ctrl+shift+7'},
        indent: {...lists.indent, shortcut: 'tab'},
        outdent: {...lists.outdent, shortcut: 'shift+tab'},
        rule: insertNode(document => document.createElement('hr')),
    }),
    toolbar: Object.freeze([
        Object.freeze({command: 'bullets', label: 'Bulleted list', text: '•–', state: true, shortcut: 'ctrl+shift+8'}),
        Object.freeze({command: 'numbers', label: 'Numbered list', text: '1–', state: true, shortcut: 'ctrl+shift+7'}),
        Object.freeze({command: 'outdent', label: 'Decrease level', text: '⇤', shortcut: 'shift+tab'}),
        Object.freeze({command: 'indent', label: 'Increase level', text: '⇥', shortcut: 'tab'}),
        Object.freeze({command: 'rule', label: 'Separator', text: '―'}),
    ]),
});
