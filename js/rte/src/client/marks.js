import {boldHtml, codeHtml, highlightHtml, italicHtml, strikeHtml, underlineHtml} from '../mark/standard.js';

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

const module = (name, list) => Object.freeze({
    name,
    commands: ({pending}) => Object.fromEntries(list.map(mark =>
        [mark.name, {...pending.toggle(mark.adapter), shortcut: mark.shortcut}])),
    toolbar: Object.freeze(list.map(mark => Object.freeze({
        command: mark.name,
        label: mark.label,
        text: mark.text,
        state: true,
        shortcut: mark.shortcut,
    }))),
});

export const marks = module('marks', MARKS);

// Optional: text set apart for its relevance (`<mark>`). Not one of the ready marks, so an
// editor offers it only where the root `highlight.js` entry was imported.
export const highlight = module('highlight', [
    {name: 'highlight', adapter: highlightHtml, label: 'Highlight', text: 'H', shortcut: 'ctrl+shift+h'},
]);
