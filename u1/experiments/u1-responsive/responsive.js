
class U1Responsive extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <style>
            :host {
                overflow: auto !important;
                display: block;
            }
            </style>
            <slot></slot>
        `;
        this.activeStrategy = null;
        this.checkOverflow = this.checkOverflow.bind(this);
        this.mutationObserver = new MutationObserver(this.checkOverflow);
        this.resizeObserver = new ResizeObserver(this.checkOverflow);
    }
  
    connectedCallback() {
        this.checkOverflow();
        this.resizeObserver.observe(this);
        this.mutationObserver.observe(this, { childList: true, subtree: true });
    }
  
    disconnectedCallback() {
        this.resizeObserver.unobserve(this);
        this.mutationObserver.disconnect();
    }
  
    checkOverflow() {

        let allStrategies = getComputedStyle(this).getPropertyValue('--u1-responsive-strategies').split(/\s+/); // z.B. "stragetie1 strategie2 strategie3 strategie4"
        allStrategies = allStrategies.filter(s => s.trim().length > 0);

        let index = allStrategies.indexOf(this.activeStrategy);


        if (this.scrollWidth > this.clientWidth) {
            index = index + 1;
        } else {
            index = index - 1;
        }
        if (index < 0) {
            this.removeAttribute(':strategy');
        } else {
            const strategy = allStrategies[index];
            if (strategy === undefined) return;
            this.activeStrategy = strategy;
        
            const strategies = allStrategies.filter((item, i) => i <= index).join(' ');
            this.setAttribute(':strategy', strategies); // sollte so aussehen "stragetie1 strategie2"
        }

        setTimeout(()=>{
//            requestAnimationFrame(() => this.checkOverflow());
        },2000)
    }
  }
  
  customElements.define('u1-responsive', U1Responsive);