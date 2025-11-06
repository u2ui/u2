import { SelectorObserver } from '../../js/SelectorObserver/SelectorObserver.js';

let store = sessionStorage;
cookieStore && cookieStore.get("u2-cookiebanner")
    .then(data => JSON.parse(data.value??'{}'))
    .then(data=> {if (data.functional) store = localStorage; })
    .finally(() => elObserver.observe('[u2-store]'));

document.addEventListener('input', e => {
    const target = e.target;
    const name = target.name;
    const form = target.form;
    const isCheckbox = target.type === 'checkbox';
    const value = isCheckbox ? target.checked : target.value;
    // save in form-store
    if (form && form.hasAttribute('u2-store')) {
        const formId = form.id || '_noid_';
        const key = 'u2-store-form-' + formId;
        const data = JSON.parse(store.getItem(key) || '{}');
        data[name] = value;
        store.setItem(key, JSON.stringify(data));
    }
    // and/or save in global-store
    if (target.hasAttribute('u2-store')) {
        const key = 'u2-store-input';
        const data = JSON.parse(store.getItem(key) || '{}');
        data[name] = value;
        store.setItem(key, JSON.stringify(data));
    }
});

const elObserver = new SelectorObserver({
    on: (el) => {
        if (el.tagName === 'FORM' && el.id) { // form-store
            const formId = el.id;
            const data = JSON.parse(store.getItem('u2-store-form-' + formId) || '{}');
            for (let input of el.elements) {
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
            const data = JSON.parse(store.getItem('u2-store-input') || '{}');
            if (el.hasAttribute('value')) return;
            if (data[el.name] == null) return;
            if (el.type === 'checkbox') {
                el.checked = data[el.name];
            } else {
                el.value = data[el.name];
            }
        }
    },
    off: (el) => {}
});
