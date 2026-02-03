import { SelectionManager } from './SelectionManager.js';


const managers = new WeakMap();

function create(el) {
    el.role ||= 'listbox';
    el.querySelectorAll(el.getAttribute('u2-selectable') || ':scope > *').forEach(item => {
        item.role ||= 'option';
        item.ariaSelected ||= 'false';
    });
    const manager = new SelectionManager(el);
    managers.set(el, manager);
    return manager;
}

function destroy(el) {
    const manager = managers.get(el);
    manager.destroy();
    managers.delete(el);
}

function init(el) {
    return managers.has(el) ? managers.get(el) : create(el);
}

import { SelectorObserver } from '../../js/SelectorObserver/SelectorObserver.js';
new SelectorObserver({ on: init, off: destroy }).observe('[u2-selectable]');