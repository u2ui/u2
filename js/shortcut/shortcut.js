
const keyAliases = Object.entries({
    'arrowup': ['↑', 'up'],
    'arrowdown': ['↓', 'down'],
    'arrowleft': ['←', 'left'],
    'arrowright': ['→', 'right'],
    'control': ['ctrl'],
    'shift': ['shift', '⇧'],
    'alt': ['alt', '⌥'],
    'meta': ['cmd', '⌘'], // Cmd für macOS
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
            if (activeIndex === keys.length - 1) {
                // callback bind to target and pass event as argument
                callback.call(target, event);
            }
        } else {
            activeIndex = -1;
        }
    });

    target.addEventListener('keyup', function (event) {
        const key = normalizeKey(event.key);
        const expectedKey = keys[activeIndex];
        if (expectedKey === key) { // wenn der letzte losgelassen wird, position einen schritt zurück
            activeIndex--;
        } else { // wenn sonst einer losgelassen wird, reset
            activeIndex = -1;
        }
    });
}



/*
maybe later: the order should probably not matter
function listen(combination, callback, options = {}) {
    const requiredKeys = new Set(combination.toLowerCase().split('+').map(k => normalizeKey(k)));
    let activeKeys = new Set();

    document.addEventListener('keydown', function(event) {
        activeKeys.add(normalizeKey(event.key.toLowerCase()));
        if (isCombinationPressed(requiredKeys, activeKeys)) {
            callback();
        }
    });

    document.addEventListener('keyup', function(event) {
        activeKeys.delete(normalizeKey(event.key.toLowerCase()));
    });
}

function isCombinationPressed(requiredKeys, activeKeys) {
    for (let key of requiredKeys) {
        if (!activeKeys.has(key)) {
            return false;
        }
    }
    return true;
}
*/