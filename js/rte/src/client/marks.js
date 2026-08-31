import {boldHtml, codeHtml, italicHtml, strikeHtml, underlineHtml} from '../mark/standard.js';

// The ready-made inline marks as one convention module. Every control goes
// through the surface's shared `PendingMarks`, so a caret toggle formats the
// next ordinary text input instead of installing a competing input route.
const MARKS = [
    {name: 'bold', adapter: boldHtml, label: 'Bold', text: 'B', shortcut: 'ctrl+b'},
    {name: 'italic', adapter: italicHtml, label: 'Italic', text: 'I', shortcut: 'ctrl+i'},
    {name: 'underline', adapter: underlineHtml, label: 'Underline', text: 'U', shortcut: 'ctrl+u'},
    {name: 'strike', adapter: strikeHtml, label: 'Strikethrough', text: 'S', shortcut: 'ctrl+shift+x'},
    {name: 'code', adapter: codeHtml, label: 'Code', text: '‹›', shortcut: 'ctrl+e'},
];

export const marks = Object.freeze({
    name: 'marks',
    commands: ({pending}) => Object.fromEntries(MARKS.map(mark =>
        [mark.name, {...pending.toggle(mark.adapter), shortcut: mark.shortcut}])),
    toolbar: Object.freeze(MARKS.map(mark => Object.freeze({
        command: mark.name,
        label: mark.label,
        text: mark.text,
        state: true,
        shortcut: mark.shortcut,
    }))),
});
