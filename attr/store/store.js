import { SelectorObserver } from '../../js/SelectorObserver/SelectorObserver.js';

let store = sessionStorage;
const readStore = key => JSON.parse(store.getItem(key) || '{}');

Promise.resolve(globalThis.cookieStore?.get("u2-cookiebanner")) // cookieStore is not everywhere available
    .then(data => JSON.parse(data?.value??'{}'))
    .then(data=> {if (data.functional) store = localStorage; })
    .finally(() => elObserver.observe('[u2-store]'));

const skipped = ['file', 'password']; // not restorable / must not be persisted
const storable = el => el.name && !skipped.includes(el.type); // values are stored by name
const inStoredForm = el => el.form?.id && el.form.hasAttribute('u2-store'); // form-store needs an id

const valueOf = el => el.type === 'checkbox' ? el.checked
    : el.type === 'select-multiple' ? [...el.selectedOptions].map(o => o.value)
    : el.value;

function restore(el, value) {
    if (value == null) return;
    switch (el.type) {
        case 'checkbox': el.checked = value; break;
        case 'radio': el.checked = el.value === value; break;
        case 'select-multiple': for (const o of el.options) o.selected = value.includes(o.value); break;
        default:
            if (el.hasAttribute('value')) return; // a preset value wins
            el.value = value;
    }
}

document.addEventListener('input', ({target}) => {
    if (!storable(target)) return;
    const value = valueOf(target);
    const save = key => {
        const data = readStore(key);
        data[target.name] = value;
        store.setItem(key, JSON.stringify(data));
    };
    if (inStoredForm(target)) save('u2-store-form-' + target.form.id);
    if (target.hasAttribute('u2-store')) save('u2-store-input');
});

const elObserver = new SelectorObserver({
    on: el => {
        if (el.tagName === 'FORM') {
            if (!el.id) return; // form-store needs an id
            const data = readStore('u2-store-form-' + el.id);
            for (const input of el.elements) if (storable(input)) restore(input, data[input.name]);
            return;
        }
        if (inStoredForm(el) || !storable(el)) return; // the form-store wins over the global-store
        restore(el, readStore('u2-store-input')[el.name]);
    }
});
