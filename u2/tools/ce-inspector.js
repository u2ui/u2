import '../../el/code/code.js';
import '../../el/tabs/tabs.js';
import '../../attr/confirm/confirm.js';
import {EventsExplorer} from './eventsExplorer.js';
import {dump, domRender} from 'https://cdn.jsdelivr.net/gh/nuxodin/dump.js@main/mod.min.js';

const baseCss = import.meta.resolve('../../css/classless/full.css');
const codeCss = import.meta.resolve('../../el/code/code.css');
const tabsCss = import.meta.resolve('../../el/tabs/tabs.css');
const tableCss = import.meta.resolve('../../class/table/table.css');


import {attributes} from 'https://cdn.jsdelivr.net/gh/nuxodin/item.js@main/drivers/htmlElementAttributes.js';
import {effect} from 'https://cdn.jsdelivr.net/gh/nuxodin/item.js@main/item.js';
import {render, html, htmlFor} from 'https://unpkg.com/uhtml@4.4.7/keyed.js';

class CeInspector extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });

        shadow.innerHTML = 
            `<style>
            @import "${baseCss}";
            @import "${tabsCss}";
            @import "${codeCss}";
            @import "${tableCss}";
            u2-code {
                font-size:13px;
            }
            slot {
                padding: 1em;
                box-shadow: 0 0 1em rgba(0,0,0,.1);
                display: grid;
                align-items: center;
                text-align:center;
                min-height: 10rem;
                margin-bottom: 2rem;
                position:relative;
            }
            </style>
            <slot></slot>
            <u2-tabs>
                <h2>Contents (HTML)</h2>
                <u2-code id=code trim editable></u2-code>
                <h2>Attributes</h2>
                <div>
                    <table class="u2-table -Flex -NoSideGaps -Fields">
                        <tbody id=attributes>
                    </table>
                </div>
                <h2>CSS Variables</h2>
                <form>
                    <table class="u2-table -Flex -NoSideGaps -Fields">
                        <tbody id=cssProperties>
                    </table>
                </form>
                <h2>CSS Parts</h2>
                <form>
                    <table class="u2-table -Flex -NoSideGaps -Fields">
                        <tbody id=cssParts>
                    </table>
                </form>
                </div>
                <h2>Events</h2>
                <div id=events></div>
            </u2-tabs>
            `;
        this.createUi();
    }
    async createUi() {
        const manifest = await this.manifest();
        const shadow = this.shadowRoot;

        const ce = this._element;

        /* code */
        const codeEl = shadow.getElementById('code');
        codeEl.value = ce.innerHTML;
        codeEl.setForeignElement(ce);

        /* events */
        const eventsEl = shadow.getElementById('events');
        const events = manifest.modules[0].declarations[0].events?.map(e => e.name);
        eventsEl.closest('u2-tabs > *').previousElementSibling.hidden = !events?.length;
        if (events?.length) {
            const eExplorer = new EventsExplorer(eventsEl, ce, events);
            eExplorer.start();
        }

        /* data */
        // const dataEl = shadow.getElementById('data');
        // dataEl.innerHTML = dump(ce, {depth:2, xcustomRender:domRender, inherited:false});

        /* attributes */
        const attributesEl = shadow.getElementById('attributes');
        const attrSchemes = manifest.modules[0].declarations[0].attributes;
        const root = attributes(ce);
        attrSchemes.push({
            name: 'style',
            description: 'Inline style',
        });
        attrSchemes.forEach(attr => {
            const {input,datalist} = toInput(attr);
            input.oninput = ({target}) => {
                if (target.type === 'checkbox' && !target.checked) {
                    root.item(attr.name).remove();
                } else {
                    root.item(attr.name).set(target.value);
                }
            }
            attr.input = input;
            attr.datalist = datalist;
        });
        effect(() => {
            render(attributesEl, html`
                ${attrSchemes.map(attr => {
                    const item = root.item(attr.name);
                    console.log(item.value)
                    //attr.input.value = item.value ?? null;
                    if (attr.input.type==='checkbox') {
                        attr.input.checked = item.value !== null;
                    } else {
                        attr.input.value = item.value ?? '';
                    }
                    return html`
                        <tr>
                            <td style="flex-basis:15rem; flex-grow:4">
                                ${item.key}
                                <br><small>${attr?.description ?? ''}</small>
                            <td style="flex-basis:9rem">
                                ${attr.input} ${attr.datalist}
                            ${/*<td style="flex:0 0 auto"><button style="all:unset" onclick="${()=>{item.remove()}}" u2-confirm><u2-ico>delete</u2-ico></button>*/null}
                    `;
                })}
            `);
        });

        // const attributesEl = shadow.getElementById('attributes');
        // const attributes = manifest.modules[0].declarations[0].attributes;
        // attributes?.length && attributes.forEach(attr => {
        //     const tr = document.createElement('tr');
        //     attributesEl.appendChild(tr);
            
        //     const {input, datalist} = toInput(attr);
        //     input.addEventListener('input', () => {
        //         if (input.type === 'checkbox') {
        //             input.checked ? ce.setAttribute(attr.name, '') : ce.removeAttribute(attr.name);
        //         } else {
        //             input.value === '' ? ce.removeAttribute(attr.name) : ce.setAttribute(attr.name, input.value);
        //         }
        //     });
        //     if (attr['u2-type'] === 'boolean') {
        //         input.checked = ce.hasAttribute(attr.name);
        //     } else {
        //         input.value = ce.getAttribute(attr.name);
        //     }
        //     tr.innerHTML = 
        //         `<td style="flex-basis:15rem; flex-grow:4">
        //             ${attr.name}<br><small>${attr.description ?? ''}</small>
        //         <td style="flex-basis:9rem">`;
        //     tr.lastElementChild.appendChild(input);
        //     if (datalist) tr.lastElementChild.appendChild(datalist);
        // });

        attributesEl.closest('u2-tabs > *').previousElementSibling.hidden = !attributes?.length;

        /* css */
        const cssPropertiesEl = shadow.getElementById('cssProperties');
        const css = manifest.modules[0].declarations[0].cssProperties;
        css?.length && css.forEach(prop => {
            const tr = document.createElement('tr');
            cssPropertiesEl.appendChild(tr);
            const {input, datalist} = toInput(prop);
            input.addEventListener('input', () => {
                if (input.value === '') {
                    ce.style.removeProperty(prop.name);
                } else {
                    ce.style.setProperty(prop.name, input.value);
                }
            });
            input.value = ce.style.getPropertyValue(prop.name);

            tr.innerHTML = 
                `<td style="flex-basis:15rem; flex-grow:4">
                    ${prop.name}<br><small>${prop.description ?? ''}</small>
                <td style="flex-basis:9rem">`;
            tr.lastElementChild.appendChild(input);
            if (datalist) tr.lastElementChild.appendChild(datalist);
        });
        cssPropertiesEl.closest('u2-tabs > *').previousElementSibling.hidden = !css?.length;

        const cssPartsEl = shadow.getElementById('cssParts');
        const parts = manifest.modules[0].declarations[0].cssParts;
        parts?.length && parts.forEach(part => {
            if (!part.name) return;
            const tr = document.createElement('tr');
            tr.style.setProperty('align-items', 'center');
            cssPartsEl.appendChild(tr);
            tr.innerHTML = 
                `<td style="flex-basis:15rem; flex-grow:4">
                    ${part.name}<br><small>${part.description ?? ''}</small>
                <td style="flex-basis:9rem">
                    <u2-code name="${part.name}" editable style="padding:.6em; border:1px solid; min-width:10rem; min-height:3rem"></u2-code>
                `;
        });
        if (!ce.id) ce.id = 'ce-' + Math.random().toString(36).substring(2);
        const style = document.createElement('style');
        ce.after(style);
        cssPartsEl.closest('form').addEventListener('input', function(e) {
            // u2-code can not participate in form submission for now
            // so we need to get its value manually
            let css = `#${ce.id} { \n`;
            this.querySelectorAll('u2-code').forEach(code => {
                if (!code.value.trim()) return;
                css += ` &::part(${code.getAttribute('name')}) {${code.value}}\n`;
            });
            css += '\n}';
            style.textContent = css;
        });
        cssPartsEl.closest('u2-tabs > *').previousElementSibling.hidden = !parts?.length;

        // /* random settings */
        // shadow.getElementById('random').addEventListener('click', () => {
        //     attributes?.length && attributes.forEach(attr => {
        //         const value = chooseRandom(attr);
        //         if (value === undefined) return;
        //         if (value===false) ce.removeAttribute(attr.name);
        //         else ce.setAttribute(attr.name, value);
        //     });
        //     css?.length && css.forEach(prop => {
        //         const value = chooseRandom(prop);
        //         if (value === undefined) return;
        //         ce.style.setProperty(prop.name, value);                
        //     });
        //     parts?.length && parts.forEach(part => {
        //         if (!part.name) return;
        //         const code = shadow.querySelector(`u2-code[name="${part.name}"]`);
        //         if (!code) return;
        //     });
        // });
        // function chooseRandom(data) {
        //     if (Array.isArray(data.u2Examples)) {
        //         return data.u2Examples[Math.floor(Math.random() * data.u2Examples.length)];
        //     }
        //     if (data['u2-type'] === 'boolean') {
        //         return Math.random() > .5;
        //     }
        //     if (data['u2-type'] === 'number') {
        //         return Math.random() * 100;
        //     }
        //     if (Array.isArray(data['u2-type'])) {
        //         return data['u2-type'][Math.floor(Math.random() * data['u2-type'].length)];
        //     }
        // }
        
    }
    async manifest() {
        let url = this.getAttribute('manifest');
        if (!url.startsWith('http')) {
            url = new URL(url, document.baseURI).href;
        }
        return await fetch(url).then(r => r.json());
    }
    connectedCallback() {
        this._element = this.firstElementChild;
    }

}

customElements.define('ce-inspector', CeInspector);



function toInput(attr) {
    let input = document.createElement('input');
    if (attr['u2-type'] === 'boolean') input.type = 'checkbox';
    if (Array.isArray(attr['u2-type'])) {
        input = document.createElement('select');
        let option = document.createElement('option');
        option.value = '';
        option.text = '---';
        input.appendChild(option);
        attr['u2-type'].forEach(o => {
            let option = document.createElement('option');
            option.value = o;
            option.text = o;
            input.appendChild(option);
        });
    }
    input.name = attr.name;
    let datalist = null;
    if (attr.u2Examples) {
        datalist = document.createElement('datalist');
        datalist.id = 'dl-' + Math.random().toString(36).substring(2);
        attr.u2Examples.forEach(e => {
            const option = document.createElement('option');
            option.value = e;
            datalist.appendChild(option);
        });
        input.setAttribute('list', datalist.id);
    }
    //input.placeholder = a;
    return {
        input,
        datalist
    }
}