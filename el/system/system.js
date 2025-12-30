
const baseUrl = import.meta.url.replace('system.js', '');

class System extends HTMLElement {
    constructor() {
        super();

        import('./styler.js');
        //import('https://cdn.jsdelivr.net/gh/nuxodin/cleanup.js/mod.min.js')

        this.popover = 'auto';
        this.style.cssText = '';
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
            :host {
                position:fixed;
                inset:1rem 1rem auto auto;
                border:2px solid red;
                box-shadow: 0 0 1rem #0006;
                &::backdrop {
                    xbackground: #0003;
                }
            }
            </style>
            <button id="demoHtml">Show Demo</button>
            <u2-system-styler id="styler"></u2-system-styler>
        `;
        this.shadowRoot.getElementById('demoHtml').addEventListener('click', () => this.demo());
    }
    connectedCallback() {

    }

    async demo() {
        let demoEl = document.getElementById('u2SystemHtmlDemo');
        if (!demoEl) {
            demoEl = document.createElement('div');
            demoEl.popover = 'manual';
            demoEl.id = 'u2SystemHtmlDemo';
            document.body.append(demoEl);
            demoEl.style = 'inset:1rem; height:fit-content; max-height:calc(100vh - 2rem); width:calc(100vw - 2rem); max-width:60rem';
            const html = await fetch(baseUrl + 'demoHtml.html').then(res => res.text());
            
            demoEl.innerHTML = `
            <style>
            #u2SystemHtmlDemo {
                box-shadow: 0 0 1rem #0006;
                padding:1rem;
                border:0;
                u2-toc ul {
                    display:flex;
                    justify-content: center;
                    a {
                        padding:1rem;
                    }
                }
            }
            </style>
            <u2-toc for="u2SystemHtmlDemo" to="1" style="position:absolute; inset:.3rem .3rem auto .3rem;"></u2-toc>
            <button u2-behavior="close" style="position:absolute; inset:.3rem .3rem auto auto; margin:0">Close</button>
            ${html}`;
        }
        demoEl.showPopover();
        this.showPopover();
        this.shadowRoot.getElementById('styler').showPopover();
    }    

}

customElements.define('u2-system', System);

addEventListener('keydown', (e) => {
    if (e.target.form !== undefined) return;
    if (e.target.isContentEditable) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key !== 's') return;

    if (!document.querySelector('u2-system').matches(':popover-open')) {
        document.querySelector('u2-system').showPopover();
    } else {
        document.querySelector('u2-system').hidePopover();
    }
});
