// todo: the order of modifiers should not matter

const keyAliases = Object.entries({
    'arrowup': ['↑', 'up'],
    'arrowdown': ['↓', 'down'],
    'arrowleft': ['←', 'left'],
    'arrowright': ['→', 'right'],
    'control': ['ctrl'],
    'shift': ['shift', '⇧'],
    'alt': ['alt', '⌥'],
    'meta': ['cmd', '⌘'],
    'escape': ['esc'],
    'enter': ['return'],
    'delete': ['del'],
    'insert': ['ins'],    
    'backspace': ['back'],
}).reduce((acc, [key, aliases]) => {
    aliases.forEach(alias => {
        acc[alias] = key;
    });
    return acc;
}, {});

function normalizeKey(key) {
    key = key.trim().toLowerCase();
    return keyAliases[key] || key;
}

export function listen(combination, callback, options = {}) {
    const target = options.target || document;
    const keys = combination.split('+').map(k => normalizeKey(k));
    let activeIndex = -1;

    target.addEventListener('keydown', function (event) {
        if (event.repeat) return;
        const key = normalizeKey(event.key);
        const expectedKey = keys[activeIndex + 1];

        if (expectedKey === key) {
            ++activeIndex;
            if (activeIndex === keys.length - 1) callback.call(target, event);
        } else {
            activeIndex = -1;
        }
    });

    target.addEventListener('keyup', function (event) {
        const key = normalizeKey(event.key);
        const expectedKey = keys[activeIndex];
        if (expectedKey === key) activeIndex--; // when the last one is released, position one step back
        else activeIndex = -1; // if any other one is released, reset
    });
}
