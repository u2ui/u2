
import '../../js/rte/rte.js';

import Showdown from 'https://cdn.skypack.dev/showdown';
import TurndownService from 'https://cdn.skypack.dev/turndown@7.1.1';

class rte extends HTMLElement {
    constructor() {
        super();
        let shadowRoot = this.attachShadow({mode:'open'});
        shadowRoot.innerHTML =
        `<style>
        :host {
            display:block;
            --u2-rte:true;
        }
        #editor {
            --u2-rte:true;
            padding:1px; /* to avoid margin collapse */
        }
        </style>
        <div id=editor contenteditable></div>
        `;
        //this.setAttribute('contenteditable', true);
        this.editor = this.shadowRoot.getElementById('editor');

        this.editor.addEventListener('input', (event)=>{

            const html = this.editor.innerHTML;

            let value = null;
            if (this.getAttribute('format') === 'markdown') {
                value = new TurndownService().turndown(html);
            } else {
                value = html;
            }

            if (this.textarea) {
                this.textarea.value = value;
            } else {
                this.innerHTML = value;
            }
        });

    }
    connectedCallback() {
        if (this.children.length === 1 && this.children[0].tagName === 'TEXTAREA') {
            this.textarea = this.children[0];
        }

        let sourceValue = this.textarea ? this.textarea.value : this.innerHTML;

        if (this.getAttribute('format') === 'markdown') {
            const converter = new Showdown.Converter();
            converter.setOption('tables', true);
            this.editor.innerHTML = converter.makeHtml(sourceValue);
        } else {
            this.editor.innerHTML = sourceValue;
        }

    }
    // attributeChangedCallback(name, oldValue, newValue) {
    //     if (name === 'format') this.format = newValue!=null;
    // }
    // static observedAttributes = ['format'];
}

customElements.define('u2-rte', rte);

