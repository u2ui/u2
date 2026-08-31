// Undo and redo as one convention module. The commands come from the surface's
// own `History`; this module only names them and their controls.
//
// The keys are declared on the commands themselves, so they work whether or not
// these controls are on screen.
export const history = Object.freeze({
    name: 'history',
    commands: ({history}) => history.commands,
    toolbar: Object.freeze([
        Object.freeze({command: 'undo', label: 'Undo', text: '↶', shortcut: 'ctrl+z'}),
        Object.freeze({command: 'redo', label: 'Redo', text: '↷', shortcut: 'ctrl+y ctrl+shift+z'}),
    ]),
});
