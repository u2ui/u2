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
    if (pending) { customElements.whenDefined(pending.localName).then(() => schedule(form)); return; }
    if (not && operator) { console.warn(`u2-disableif: "!" cannot be combined with "${operator}"`, el); return; }
    if (!form.elements[field]) console.warn(`u2-disableif: field "${field}" not found, so it is empty`, el); // a typo?
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

/** One update per form and `wait` (microtask, frame), however many changes ask for it. */
const scheduled = new Map();
function schedule(form, wait = queueMicrotask) {
    const forms = scheduled.get(wait) ?? scheduled.set(wait, new WeakSet()).get(wait);
    if (!form || forms.has(form)) return;
    forms.add(form);
    wait(() => { forms.delete(form); update(form); });
}

/** Typing applies at once. Fields and conditions that are added, removed or changed in the form
 *  apply on the next microtask; one that changes its form also updates the new one. */
const ATTRIBUTES = ['u2-disableif', 'name', 'form', 'value', 'checked', 'selected', 'multiple', 'type'];
const watched = new WeakSet();
function watch(form) {
    if (!form || watched.has(form)) return;
    watched.add(form);
    form.addEventListener('input', () => update(form));
    form.addEventListener('reset', () => setTimeout(() => update(form))); // the values change after the event
    new MutationObserver(records => {
        schedule(form);
        for (const { target } of records) if (target.form !== form) { watch(target.form); schedule(target.form); }
    }).observe(form, { subtree: true, childList: true, attributes: true, attributeFilter: ATTRIBUTES });
}

new SelectorObserver({
    on: (el) => {
        watch(el.form);
        schedule(el.form);
        // wait for custom-element-inputs
        // queueMicrotask(() => schedule(el.form));
        schedule(el.form, requestAnimationFrame);
        // setTimeout(() => schedule(el.form));
    },
}).observe('[u2-disableif]');
