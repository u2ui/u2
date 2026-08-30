import {unstyleCommand} from '../command/unstyle.js';
import {Unstyle, defaultUnstyleLevels} from '../unstyle/unstyle.js';

export function unstyles(levels = defaultUnstyleLevels, {
    name = 'unstyle',
    control = 'unstyle',
    command = 'unstyle',
    label = 'Remove formatting',
    text = 'T×',
    shortcut = 'ctrl+\\',
} = {}) {
    for (const [property, value] of Object.entries({name, control, command, label, text})) {
        if (typeof value !== 'string' || !value.trim()) {
            throw new TypeError(`Unstyle module ${property} must be a non-empty string`);
        }
    }
    const policy = new Unstyle(levels);
    const commands = Object.freeze({[command]: {...unstyleCommand(policy), shortcut}});
    return Object.freeze({
        name: name.trim(),
        commands: () => commands,
        toolbar: Object.freeze([Object.freeze({
            name: control.trim(),
            command: command.trim(),
            label: label.trim(),
            text: text.trim(),
            shortcut,
        })]),
    });
}

export const unstyle = unstyles();
