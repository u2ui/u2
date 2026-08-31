import {BlockStyles} from '../command/block-style.js';

export const defaultBlockStyles = Object.freeze([
    Object.freeze({name: 'paragraph', label: 'Paragraph', selector: 'p', tag: 'p'}),
    Object.freeze({name: 'h1', label: 'Heading 1', selector: 'h1', tag: 'h1'}),
    Object.freeze({name: 'h2', label: 'Heading 2', selector: 'h2', tag: 'h2'}),
    Object.freeze({name: 'h3', label: 'Heading 3', selector: 'h3', tag: 'h3'}),
]);

export function blockStyles(styles = defaultBlockStyles, {
    name = 'blocks',
    control = 'block',
    command = 'blockStyle',
    label = 'Block style',
} = {}) {
    for (const [property, value] of Object.entries({name, control, command, label})) {
        if (typeof value !== 'string' || !value.trim()) throw new TypeError(`Block module ${property} must be a non-empty string`);
    }
    const policy = new BlockStyles(styles);
    const commands = Object.freeze({[command]: policy.command()});
    const options = Object.freeze(policy.styles.map(style => Object.freeze({
        value: style.name,
        label: style.label,
    })));
    return Object.freeze({
        name: name.trim(),
        commands: () => commands,
        toolbar: Object.freeze([Object.freeze({
            type: 'select',
            name: control.trim(),
            command: command.trim(),
            label,
            options,
        })]),
    });
}

export const blocks = blockStyles();
