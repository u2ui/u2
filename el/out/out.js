const itemJsRoot = '../../../../nuxodin/item.js/';
//import { effect } from '../../../../nuxodin/item.js/item.js';

class Out extends HTMLElement {
    connectedCallback() {}
    async render() {
        const item = this._item;
        const {effect} = await import(itemJsRoot+'item.js');
        effect(async ()=>{
            this.innerText = item.value;
        });
    }
    static observedAttributes = ['item'];
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'item') this._setPath(newValue);
    }
    async _setPath(string) {
        let item = null;

        const path = string.trim().split('.');
        const first = path.shift();
        switch (first) {
            case 'localStorage':
                item = (await import(itemJsRoot+'drivers/localStorage.js')).getStore();
                break;
            case 'cookie':
                item = (await import(itemJsRoot+'drivers/Cookie.js')).cookies();
                break;
            case 'navigator':
                item = (await import(itemJsRoot+'drivers/navigator.js')).store();
                break;
            default:
                throw new Error('Unknown item: '+first);
        }
        this._item = item.sub(path);
        this.render();
    }

}

customElements.define('u2-out', Out);
