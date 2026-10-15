import { SelectorObserver } from '../../js/SelectorObserver/SelectorObserver.js';

/**
 * Whether the element's condition holds. A field's values are what the form would send under its
 * name (FormData): none for an unchecked box or a disabled field, several for same-named fields or
 * a select multiple; a file counts by its name. undefined: no valid condition (yet).
 */
function holds(el, data) {
    const match = el.getAttribute('u2-disableif').match(/^(!?)([^=!<>]*)(=|!=|>|<)?([^=!<>]*)$/);
    if (!match) return;
    const [, not, field, operator, value] = match;
    const form = el.form;
    // a custom element that is not defined yet is no form field yet: check again once it is
    const pending = !form.elements[field] && form.querySelector(`:not(:defined)[name="${CSS.escape(field)}"]`);
    if (pending) { customElements.whenDefined(pending.localName).then(() => update(form)); return; }
    const problem = not && operator ? `"!" cannot be combined with "${operator}"`
        : !form.elements[field] ? `field "${field}" not found` : '';
    if (problem) { console.warn('u2-disableif: ' + problem, el); return; }
    const values = data.getAll(field).map(v => typeof v === 'string' ? v : v.name);
    switch (operator) {
        case '=': return values.includes(value);
        case '!=': return !values.includes(value);
        case '>': return values.some(v => parseFloat(v) > parseFloat(value));
        case '<': return values.some(v => parseFloat(v) < parseFloat(value));
    }
    return values.some(Boolean) !== !!not;
}

/** Applies all conditions of the form, again until nothing changes: disabling a field empties it for
 *  the conditions that depend on it. A cycle stops after as many passes as there are conditions. */
function update(form) {
    const els = [...form.elements].filter(el => el.hasAttribute('u2-disableif'));
    for (let pass = 0; pass <= els.length; pass++) {
        const data = new FormData(form); // fires "formdata", once per pass
        let changed = false;
        for (const el of els) {
            const disabled = holds(el, data);
            if (disabled === undefined || disabled === el.disabled) continue;
            el.disabled = disabled;
            changed = true;
        }
        if (!changed) return;
    }
}

const forms = new WeakSet();

new SelectorObserver({
    on: (el) => {
        const form = el.form;
        if (!form) return;
        if (!forms.has(form)) {
            forms.add(form);
            form.addEventListener('input', () => update(form));
            form.addEventListener('reset', () => setTimeout(() => update(form))); // the values change after the event
        }
        update(form);
        // wait for custom-element-inputs
        // queueMicrotask(() => update(form));
        requestAnimationFrame(() => update(form));
        // setTimeout(() => update(form));
    },
}).observe('[u2-disableif]');
