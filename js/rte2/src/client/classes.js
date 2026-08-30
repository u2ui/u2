import {classMark} from '../mark/standard.js';
import {valueMark} from '../command/mark.js';

// Optional content-class control. The choices come from the host's
// `--u2-rte-classes`, so one declaration decides what the control offers, what
// the sanitizer keeps, and what presentation cleanup leaves alone.
//
// The group is one mark type and therefore mutually exclusive. An application
// that needs independent axes registers a second module with its own adapter.
export function classStyles({label = 'Style', name = 'style', command = 'classStyle'} = {}) {
    for (const value of [label, name, command]) {
        if (typeof value !== 'string' || !value.trim()) throw new TypeError('A class control needs names');
    }
    const adapters = new Map();
    return Object.freeze({
        name: 'classes',
        commands: ({surface}) => ({[command]: styleCommand(adapters, surface)}),
        toolbar: Object.freeze([Object.freeze({
            type: 'select',
            name,
            command,
            label,
            options: surface => surface.config.classes.map(value => ({value, label: value})),
        })]),
    });
}

export const classes = classStyles();

// One adapter per configured group, so the same host keeps one mark identity
// across refreshes and two hosts with the same classes share it.
function styleCommand(adapters, surface) {
    const resolve = () => {
        const names = surface.config.classes;
        if (!names.length) return null;
        const key = names.join(' ');
        if (!adapters.has(key)) adapters.set(key, valueMark(classMark(names)));
        return adapters.get(key);
    };
    return {
        enabled: edit => !!resolve()?.enabled(edit),
        state: edit => resolve()?.state(edit) ?? null,
        run: edit => resolve()?.run(edit),
    };
}
