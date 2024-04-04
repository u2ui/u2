import '../../el/tooltip/tooltip.js';
import '../../el/ico/ico.js';
import '../../el/code/code.js';
import '../../el/tabs/tabs.js';

const toolTipCss = import.meta.resolve('../../el/tooltip/tooltip.css');
const icoCss = import.meta.resolve('../../el/ico/ico.css');
const codeCss = import.meta.resolve('../../el/code/code.css');
const tabsCss = import.meta.resolve('../../el/tabs/tabs.css');

document.head.insertAdjacentHTML('beforeend', `<link rel=stylesheet href="${toolTipCss}">`); // zzz if popover

class DevIframe extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.innerHTML = 
            `<style>
            @import url("${icoCss}");
            @import url("${codeCss}");
            @import url("${tabsCss}");
            /*@import url("${toolTipCss}"); todo when switch to popover as tooltips then stay */
            :host {
                display: flex;
                flex-direction: column;
                xheight: 60rem;
                border: 1px solid #ccc;
                background:var(--color-bg, white);
                --u2-ico-dir:'https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.33/svg/{icon}/baseline.svg';
            }
            #tools {
                display: flex;
                flex-wrap: wrap;
                align-items: stretch;
                border-bottom: 1px solid #ccc;
                background: #f8f8f8;
            }
            #tools > label, #tools > button {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: .3rem;
                font-size: 13px;
                border: 1px solid #ccc;
                padding: .3rem .5rem;
                margin: -1px;
                background: transparent;
            }
            #tools > button { margin-left:auto; }
            #tools u2-ico { --size:1.6em; }
            #wrap {
                width:90%;
                height:20rem;
                margin:2rem auto;
                align-self:center;
                flex: 1 1 auto;
                resize: both;
                overflow:auto;
                border:1px solid #ccc;
                & > iframe {
                    border: 0;
                    width: 100%;
                    height: 100%;
                }
            }
            u2-code {
                font-size: 13px;
                line-height:1.7;
            }
            u2-tabs {
                max-height: 30rem;
            }
            </style>
            <form id=tools>
                <label>
                    <input type=checkbox name=js checked> Javascript
                </label>
                <label>
                    <input type=checkbox name=u2css checked> U2 styles
                </label>
                <label>
                    <u2-ico icon=contrast></u2-ico>
                    <u2-tooltip>Color-Scheme</u2-tooltip>
                    <select name=color-scheme>
                        <option value="">auto
                        <option value=light>light
                        <option value=dark>dark
                    </select>
                </label>
                <label>
                    <u2-ico icon=text_rotation_down></u2-ico>
                    <u2-tooltip>Writing mode</u2-tooltip>
                    <select name=writing-mode>
                        <option value=horizontal-tb>horizontal-tb
                        <option value=vertical-rl>vertical-rl
                        <option value=vertical-lr>vertical-lr
                    </select>
                </label>
                <label>
                    <u2-ico icon=format_textdirection_r_to_l></u2-ico>
                    <u2-tooltip>Text Direction</u2-tooltip>
                    <select name=direction>
                        <option value=ltr>left to right</option>
                        <option value=rtl>right to left</option>
                    </select>
                </label>
                <button type=button onclick="this.getRootNode().host.requestFullscreen()">
                    <u2-ico icon=fullscreen></u2-ico>
                    <u2-tooltip>Fullscreen</u2-tooltip>
                </button>
            </form>
            <div id=wrap>
               <iframe src=""></iframe>
            </div>
            <u2-tabs>
                <h2>HTML</h2>
                <u2-code id=html trim editable xlanguage=html></u2-code>
                <h2>CSS</h2>
                <u2-code id=css trim editable xlanguage=css></u2-code>
                <h2>JS</h2>
                <u2-code id=js trim editable xlanguage=javascript></u2-code>
            </u2-tabs>
            `;

        const frame = shadow.querySelector('iframe');
        const form = shadow.querySelector('#tools');
    
        form.addEventListener('change', e => {
            const data = Object.fromEntries(new FormData(form));
    
            let sandbox = 'allow-same-origin allow-modals allow-forms allow-popups';
            if (data['js']) sandbox += ' allow-scripts';
    
            frame.contentDocument.isOld = true;
            frame.sandbox = sandbox;
            frame.onload = () => run();
            frame.src = frame.src
            const interval = setInterval(() => {
                if (frame.contentDocument.isOld) return;
                if (frame.contentDocument.readyState !== 'interactive') return;
                clearInterval(interval);
                run();
            }, 10);
            let run = ()=>{
                clearInterval(interval);
                run = ()=>{}
                this.dispatchEvent(new CustomEvent('dev-iframe-document-ready', { detail: { frame, document: frame.contentDocument } }));
                frame.contentDocument.documentElement.style.writingMode = data['writing-mode'];
                frame.contentDocument.documentElement.dir = data['direction'];
                frame.contentDocument.documentElement.style.colorScheme = data['color-scheme'];
                if (!data['u2css']) {
                    frame.contentDocument.querySelectorAll('link').forEach(link => {
                        if (link.href.includes('css/base/')) link.remove();
                        if (link.href.includes('css/classless/')) link.remove();
                    });
                }

                const htmlEl = frame.contentDocument.querySelector('.main:not(script,style)');
                const jsEl = frame.contentDocument.querySelector('script.main');
                const cssEl = frame.contentDocument.querySelector('style.main');

                htmlEl && shadow.querySelector('#html').setForeignElement(htmlEl);
                jsEl && shadow.querySelector('#js').setForeignElement(jsEl);
                cssEl && shadow.querySelector('#css').setForeignElement(cssEl);
                

            }
        });
    }

    // Beobachte Änderungen des 'src'-Attributs
    static get observedAttributes() {
        return ['src'];
    }

    // Reagiere auf Änderungen des 'src'-Attributs
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'src') {
            const iframe = this.shadowRoot.querySelector('iframe');
            if (iframe) {
                iframe.src = newValue;
            }
        }
    }
}

// Definiere das 'dev-iframe' Element
customElements.define('dev-iframe', DevIframe);