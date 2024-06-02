import { promiseElementById } from "../../u2/tools/promiseElementById.js";


class U2Copy extends HTMLElement {
    constructor() {
        super();
        this.mutationObserver = new MutationObserver(() => {
            this.updateContent();
        });
    }

    static get observedAttributes() {
        return ['for', 'sync'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'for') {
            this._targetElement = null;
            this._targetElementPromise = promiseElementById(newValue);
            this.innerHTML = '';
            this._targetElementPromise.then(target => {
                this._targetElement = target;
                if (!this._targetElement) return;
                if (this.sync) this.sync = true;
                this.updateContent();
            });
        }
        if (name === 'sync') {
            this.sync = newValue!==null;
        }
    }
    set sync(value) {
        if (!value) {
            this.mutationObserver.disconnect();
        } else {
            if (this._targetElement) {
                this.mutationObserver.observe(this._targetElement, { childList: true, subtree: true, characterData: true });
            }
        }
        this._sync = value;
    }
    get sync() {
        return this._sync;
    }

    connectedCallback() {
        //this.updateContent(); 
    }
    disconnectedCallback() {
        this.mutationObserver.disconnect();
    }

    updateContent() {
        this.innerHTML = '';
        if (this._targetElement) {
            let content = this._targetElement.innerHTML;

            // replace all ids with unique ids and if references are made (label[for]) to the original id, replace them with the new id
            const fragment = document.createRange().createContextualFragment(content);
            const elements = fragment.querySelectorAll('[id]');

            // todo:
            // aria-Attribute (z.B. aria-labelledby, aria-describedby, aria-controls, aria-owns, aria-activedescendant, aria-flowto)
            // svg: use xlink:href, clip-path, mask, fill, stroke, filter, marker, pattern, gradient
            // headers attribute in table cells
            // usemap attribute in img
            // form attribute in input, button, select, textarea, label
            // href-Attribute in a, area
            // list-Attribute in input-elements

            const idMap = new Map();
            elements.forEach(element => {
                const id = element.id;
                const newId = id + '-' + Math.random().toString(36).substring(2);
                idMap.set(id, newId);
                element.id = newId;
            });
            const references = fragment.querySelectorAll('[for]');
            references.forEach(element => {
                const id = element.getAttribute('for');
                if (idMap.has(id)) {
                    element.setAttribute('for', idMap.get(id));
                }
            });

            this.appendChild(fragment);
        }
    }
}

customElements.define('u2-copy', U2Copy);