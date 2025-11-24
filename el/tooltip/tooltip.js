import {Placer} from '../../js/Placer/Placer.js';

let idCounter = 0;

customElements.define('u2-tooltip', class extends HTMLElement {
    constructor() {
        super();
        this.placer = new Placer(this, { x:'center', y:'after', margin:15 });
    }
    connectedCallback() {
        this.role = 'tooltip';
        //this.popover = 'auto';
        this.popover = 'manual';
        this.popover = 'hint';

        if (!this.id) { // if no id is set, set one an make it the tooltip for its parent
            this.id = 'u2-tooltip-' + idCounter++;
            this.parentNode.setAttribute('aria-labelledby', this.id);
            //this.parentNode.ariaLabelledByElements = [this]; // new variant, todo if supported everywhere
            this.connectedByChildhood = this.parentNode;
        }
    }
    disconnectedCallback() {
        if (this.connectedByChildhood) {
            this.removeAttribute('id');
            this.connectedByChildhood.removeAttribute('aria-labelledby');
        }
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


        // beta
        if (this.getAttribute('position') === 'auto') {
            const xy = isSpaceOccupied(el, 'right')? {y:'after',x:'center'} : {y:'center',x:'after'};
            this.placer.setOptions(xy);
        }

        this.placer.toElement(el);
        this.setAttribute(':position-x', this.placer.positionX); // just for css arrow-placement
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
    getTooltipForElement(e.relatedTarget)?._showFor(e.relatedTarget);
    getTooltipForElement(e.target)?.hide();
}
function getTooltipForElement(el) {
    if (!el?.getAttribute) return; // if document
    let tt = null;
    tt = el.ariaLabelledByElements?.find(tt => tt.tagName === 'U2-TOOLTIP') || el.ariaDescribedByElements?.find(tt => tt.tagName === 'U2-TOOLTIP');
    if (tt) return tt;
    // zzz fallback remove if supported everywhere
    const id = el.getAttribute('aria-labelledby') || el.getAttribute('aria-describedby');
    if (!id) return;
    const tooltip = document.getElementById(id);
    if (!tooltip || tooltip.tagName !== 'U2-TOOLTIP') return;
    return tooltip;
}



// position "auto"
function isSpaceOccupied(referenceElement, position) {
    const importantSelector = 'button, p, h1, h2, h3, h4, h5, h6, input, textarea, a, strong, em, li, dt, dd, td, th, label';
    const offset = 30; 
    const refRect = referenceElement.getBoundingClientRect();
    let testX, testY;
    switch (position) {
        case 'right':
            testX = refRect.right + offset;
            testY = refRect.top + refRect.height / 2;
            break;
        case 'left':
            testX = refRect.left - offset;
            testY = refRect.top + refRect.height / 2;
            break;
        case 'bottom':
            testX = refRect.left + refRect.width / 2;
            testY = refRect.bottom + offset;
            break;
        case 'top':
            testX = refRect.left + refRect.width / 2;
            testY = refRect.top - offset;
            break;
        default:
            console.error(`Ungültige Position: ${position}`);
            return true; // Im Zweifel: Keine Platzierung erlauben
    }
    if (testX < 0 || testX > window.innerWidth || testY < 0 || testY > window.innerHeight) {
        return true; 
    }
    const elementsAtPoint = document.elementsFromPoint(testX, testY);
    for (const element of elementsAtPoint) {
        if (element === referenceElement || referenceElement.contains(element)) continue;
        if (element.matches(importantSelector)) return true;
    }
    return false;
}
