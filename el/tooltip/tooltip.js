import {Placer} from '../../js/Placer/Placer.js';

let idCounter = 0;

customElements.define('u1-tooltip', class extends HTMLElement {
    constructor() {
        super();
        this.placer = new Placer(this, { x:'center', y:'after', margin:20 });
    }
    connectedCallback() {
        if (!this.id) { // if no id is set, set one an make it the tooltip for its parent
            this.id = 'u1-tooltip-' + idCounter++;
            this.parentNode.setAttribute('aria-labelledby', this.id);
        }
        const rootEl = document.body; // zzz if popover
        this.parentNode !== rootEl && rootEl.append(this); // zzz if popover

        /* popover */
        // this.setAttribute('popover','auto');
        // this.style.margin = '0';
    }
    _showFor(el){
        let event = new CustomEvent('u1-tooltip-show', {bubbles: true, cancelable: true, detail: {tooltip: this} });
        el.dispatchEvent(event);
        if (event.defaultPrevented) return;

        let sEvent = new CustomEvent('u1-show', {bubbles: true, cancelable: true, detail: {target: el} });
        this.dispatchEvent(sEvent);
        if (event.defaultPrevented) return;

        return this.showFor(el);
    }
    showFor(el){
        /* popover */
        //this.showPopover();

        this.setAttribute('open','');
        this.placer.toElement(el); // todo z-index top
        this.setAttribute(':position-x', this.placer.positionX);
        this.setAttribute(':position-y', this.placer.positionY);

    }
    hide(){
        this.removeAttribute('open');

        /* popover */
        //this.hidePopover();
    }
    attributeChangedCallback(name, old, value) {
        if (name === 'position') {
            if (value === 'top')    this.placer.setOptions({y:'before',x:'center'});
            if (value === 'bottom') this.placer.setOptions({y:'after',x:'center'});
            if (value === 'left')   this.placer.setOptions({y:'center',x:'before'});
            if (value === 'right')  this.placer.setOptions({y:'center',x:'after'});
        }
    }
    static get observedAttributes() {
        return ['position'];
    }
});


document.addEventListener('mouseenter',checkOn,true); // on document: chrome
addEventListener('focusin',checkOn,true);
document.addEventListener('mouseleave',checkOff,true);
addEventListener('focusout',checkOff,true);

function checkOn(e){
    getTooltipForElement(e.target)?._showFor(e.target);
}
function checkOff(e){
    getTooltipForElement(e.target)?.hide();
}
function getTooltipForElement(el) {
    if (!el.getAttribute) return; // if document
    const id = el.getAttribute('aria-labelledby') || el.getAttribute('aria-describedby');
    if (!id) return;
    const tooltip = document.getElementById(id);
    if (!tooltip || tooltip.tagName !== 'U1-TOOLTIP') return;
    return tooltip;
}
