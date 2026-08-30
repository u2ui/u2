import {insertFragment} from '../command/fragment.js';
import {ExternalInput} from '../input/external-input.js';
import {defaultUnstyle} from '../unstyle/unstyle.js';

// Optional convention-client bridge. The sanitizer is deliberately mandatory:
// choosing a security boundary is application policy until one safe adapter is
// available in every target engine.
export function externalInputs({
    sanitizer,
    unstyle = defaultUnstyle,
    through,
    name = 'external-input',
    command = 'insertFragment',
} = {}) {
    if (typeof sanitizer?.sanitize !== 'function') {
        throw new TypeError('External input module requires a sanitizer');
    }
    if (unstyle !== null && typeof unstyle?.clean !== 'function') {
        throw new TypeError('External input module requires an Unstyle policy or null');
    }
    if (through === undefined) through = unstyle ? importLevel : null;
    if (through !== null && typeof through !== 'string' && typeof through !== 'function') {
        throw new TypeError('External input module cleanup level must be a string, function, or null');
    }
    if (through !== null && !unstyle) {
        throw new TypeError('External input module cleanup level requires an Unstyle policy');
    }
    for (const [property, value] of Object.entries({name, command})) {
        if (typeof value !== 'string' || !value.trim()) {
            throw new TypeError(`External input module ${property} must be a non-empty string`);
        }
    }
    name = name.trim();
    command = command.trim();
    const registered = Object.freeze({[command]: insertFragment});
    return Object.freeze({
        name,
        commands: () => registered,
        attach({surface, commands}) {
            return new ExternalInput(surface, {commands, sanitizer, unstyle, through, command});
        },
    });
}

export function importLevel({surface}) {
    return surface.element.ownerDocument.defaultView.getComputedStyle(surface.element)
        .getPropertyValue('--u2-rte-import-unstyle').trim() || 'none';
}
