import {Placer} from '../../js/Placer/Placer.js';

let idCounter = 0;

customElements.define('u2-tooltip', class extends HTMLElement {
    constructor() {
        super();
        this.placer = new Placer(this, { x:'center', y:'after', margin:20 });
    }
    connectedCallback() {
        if (!this.id) { // if no id is set, set one an make it the tooltip for its parent
            this.id = 'u2-tooltip-' + idCounter++;
            this.parentNode.setAttribute('aria-labelledby', this.id);
        }
        this.setAttribute('role', 'tooltip');
        this.setAttribute('popover','auto');
    }
    _showFor(el){
        let event = new CustomEvent('u2-tooltip-show', {bubbles: true, cancelable: true, detail: {tooltip: this} });
        el.dispatchEvent(event);
        if (event.defaultPrevented) return;

        let sEvent = new CustomEvent('u2-show', {bubbles: true, cancelable: true, detail: {target: el} });
        this.dispatchEvent(sEvent);
        if (event.defaultPrevented) return;

        return this.showFor(el);
    }
    showFor(el){
        clearTimeout(this.hideTimeout);
        setTimeout(()=>this.setAttribute('open',''),0); // to make sure the css transition is triggered
        this.showPopover();
        this.placer.toElement(el);
        this.setAttribute(':position-x', this.placer.positionX);
        this.setAttribute(':position-y', this.placer.positionY);
    }
    hide(){
        this.removeAttribute('open');
        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(()=>this.hidePopover(),400); // wait for the css transition to finish
    }
    attributeChangedCallback(name, old, value) {
        if (name === 'position') {
            if (value === 'top')    this.placer.setOptions({y:'before',x:'center'});
            if (value === 'bottom') this.placer.setOptions({y:'after',x:'center'});
            if (value === 'left')   this.placer.setOptions({y:'center',x:'before'});
            if (value === 'right')  this.placer.setOptions({y:'center',x:'after'});
        }
    }
    static observedAttributes = ['position'];
});



document.addEventListener('mouseenter',function(e){
    if (e.target.shadowRoot) {
        e.target.shadowRoot.addEventListener('mouseenter',checkOn,true);
        e.target.shadowRoot.addEventListener('mouseleave',checkOff,true);
    }
},true);


document.addEventListener('mouseenter',checkOn,true); // on document: chrome
addEventListener('focusin',checkOn,true);
document.addEventListener('mouseleave',checkOff,true);
addEventListener('focusout',checkOff,true);


function checkOn(e){
    // todo: composedPath() for shadowdom? console.log(e.composedPath())
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
    if (!tooltip || tooltip.tagName !== 'U2-TOOLTIP') return;
    return tooltip;
}
