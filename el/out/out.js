const itemJsRoot = '../../../../nuxodin/item.js/';
import { AsyncItem } from '../../../../nuxodin/item.js/tools/AsyncItem.js';
import { effect } from '../../../../nuxodin/item.js/item.js';


class Out extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.outEl = this.shadowRoot;
    }
    connectedCallback() {}
    async render() {
        const value = await this._item.get();
        effect(async ()=>{
            this._item.get(); // just to register the signal
            this.outEl.innerHTML = value;
        });
    }
    static observedAttributes = ['item'];
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'item') {
            this._setPath(newValue);
        }
    }
    async _setPath(string) {
        let item = null;

        const path = string.trim().split('.');
        const first = path.shift();
        switch (first) {
            case 'localStorage':
                item = (await import(itemJsRoot+'drivers/LocalStorage.js')).getStore();
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

        path.forEach( key => {
            item = item.item(key);
        });
        this._item = item;
        this.render();
    }

}

const localStorage = (await import(itemJsRoot+'drivers/LocalStorage.js')).getStore();



customElements.define('u2-out', Out);
