import { SelectorObserver } from '../../js/SelectorObserver/SelectorObserver.js';

let store = sessionStorage;
const readStore = key => JSON.parse(store.getItem(key) || '{}');

Promise.resolve(globalThis.cookieStore?.get("u2-cookiebanner")) // cookieStore is not everywhere available
    .then(data => JSON.parse(data?.value??'{}'))
    .then(data=> {if (data.functional) store = localStorage; })
    .finally(() => elObserver.observe('[u2-store]'));

document.addEventListener('input', e => {
    const target = e.target;
    const name = target.name;
    const form = target.form;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const save = key => {
        const data = readStore(key);
        data[name] = value;
        store.setItem(key, JSON.stringify(data));
    };
    // save in form-store
    if (form?.hasAttribute('u2-store')) save('u2-store-form-' + (form.id || '_noid_'));
    // and/or save in global-store
    if (target.hasAttribute('u2-store')) save('u2-store-input');
});

const elObserver = new SelectorObserver({
    on: (el) => {
        if (el.tagName === 'FORM' && el.id) { // form-store
            const data = readStore('u2-store-form-' + el.id);
            for (const input of el.elements) {
                if (!input.name) continue;
                if (input.hasAttribute('value') && input.type !== 'checkbox') continue;
                if (data[input.name] == null) continue;
                if (input.type === 'checkbox') {
                    input.checked = data[input.name];
                } else {
                    input.setAttribute('value', data[input.name]); // marks the element so it won't be overwritten by the global-input-store
                    input.value = data[input.name];
                }
            }
        } else { // global-store
            const data = readStore('u2-store-input');
            if (el.hasAttribute('value') || data[el.name] == null) return;
            el.type === 'checkbox' ? el.checked = data[el.name] : el.value = data[el.name];
        }
    },
    off: (el) => {}
});
