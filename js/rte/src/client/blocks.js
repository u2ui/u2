import {BlockStyles} from '../command/block-style.js';

export const defaultBlockStyles = Object.freeze([
    Object.freeze({name: 'paragraph', label: 'Paragraph', selector: 'p', tag: 'p'}),
    Object.freeze({name: 'h1', label: 'Heading 1', selector: 'h1', tag: 'h1'}),
    Object.freeze({name: 'h2', label: 'Heading 2', selector: 'h2', tag: 'h2'}),
    Object.freeze({name: 'h3', label: 'Heading 3', selector: 'h3', tag: 'h3'}),
]);

// `Absatz(p), Lead(p.lead), Notiz(p[aria-label=note])` — the label names it, the selector says what
// it is. What follows the tag is written when the style is applied and taken off when another one
// replaces it, so a class or an attribute needs no code of its own.
export function declaredStyles(declared) {
    return Object.entries(declared).map(([label, selector]) => {
        const [tag] = selector.match(/^[a-z][a-z\d-]*/) ?? [];
        const classes = [...selector.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map(match => match[1]);
        const attributes = [...selector.matchAll(/\[([a-z][\w-]*)(?:=([^\]\s]+))?\]/g)]
            .map(match => [match[1], (match[2] ?? '').replace(/^["']|["']$/g, '')]);
        return {
            name: selector, label, selector, tag,
            write: element => {
                if (classes.length) element.classList.add(...classes);
                for (const [name, value] of attributes) element.setAttribute(name, value);
            },
            clear: element => {
                for (const [name] of attributes) element.removeAttribute(name);
                if (!classes.length) return;
                element.classList.remove(...classes);
                if (!element.classList.length) element.removeAttribute('class'); // rather than an empty one
            },
        };
    });
}

export function blockStyles(styles = defaultBlockStyles, {
    name = 'blocks',
    control = 'block',
    command = 'blockStyle',
    label = 'Block style',
} = {}) {
    for (const [property, value] of Object.entries({name, control, command, label})) {
        if (typeof value !== 'string' || !value.trim()) throw new TypeError(`Block module ${property} must be a non-empty string`);
    }
    // A host may name its own styles; hosts that name the same ones share a policy, because reading
    // a declaration is cheap and building the policy behind it is not.
    const policies = new Map();
    const resolve = surface => {
        const declared = surface.config.blocks;
        const key = declared ? JSON.stringify(declared) : '';
        if (!policies.has(key)) policies.set(key, new BlockStyles(declared ? declaredStyles(declared) : styles));
        return policies.get(key);
    };
    return Object.freeze({
        name: name.trim(),
        commands: ({surface}) => ({[command]: resolve(surface).command()}),
        toolbar: Object.freeze([Object.freeze({
            type: 'select',
            name: control.trim(),
            command: command.trim(),
            label,
            options: surface => resolve(surface).styles.map(style => ({value: style.name, label: style.label})),
        })]),
    });
}

export const blocks = blockStyles();
