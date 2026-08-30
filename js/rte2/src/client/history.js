// Undo and redo as one convention module. The commands come from the surface's
// own `History`; this module only names them and their controls.
//
// The controls carry no shortcut: the input pipeline owns Ctrl/Command+Z, +Y,
// and Shift+Z, so a key never reaches two handlers.
export const history = Object.freeze({
    name: 'history',
    commands: ({history}) => history.commands,
    toolbar: Object.freeze([
        Object.freeze({command: 'undo', label: 'Undo', text: '↶'}),
        Object.freeze({command: 'redo', label: 'Redo', text: '↷'}),
    ]),
});
