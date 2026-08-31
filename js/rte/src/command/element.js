import {Point} from '../selection/point/point.js';

// The one element a selection covers, when it covers exactly that element and
// nothing else. Clicking an image inside a contenteditable produces such a
// selection, which is what makes an atomic element addressable at all.
export function selectedElement(edit, match = null) {
    if (!edit.range || edit.range.collapsed) return null;
    const nodes = edit.range.roots();
    const element = nodes.length === 1 && nodes[0].nodeType === Node.ELEMENT_NODE ? nodes[0] : null;
    if (!element || !edit.element.contains(element)) return null;
    return !match || match(element, edit) ? element : null;
}

// A value command over a fixed set of that element's attributes. A missing or
// empty value removes its attribute, which is what "back to its own size" means
// for an image, so one command both sets and clears.
export function elementAttributes(names, {match = null} = {}) {
    if (!Array.isArray(names) || !names.length) throw new TypeError('An attribute command requires attribute names');
    const attributes = names.map(name => String(name).toLowerCase());
    return {
        enabled: edit => !!selectedElement(edit, match),
        state(edit) {
            const element = selectedElement(edit, match);
            if (!element) return null;
            const value = {};
            for (const name of attributes) {
                if (element.hasAttribute(name)) value[name] = element.getAttribute(name);
            }
            return value;
        },
        run(edit) {
            const element = selectedElement(edit, match);
            if (!element) return null;
            for (const name of attributes) {
                const value = edit.value?.[name];
                if (value === undefined || value === null || value === '') element.removeAttribute(name);
                else element.setAttribute(name, String(value));
            }
            edit.transaction.touch(element);
            // The element stays selected, so the UI acting on it stays up.
            edit.select(Point.before(element), Point.after(element));
            return element;
        },
    };
}
