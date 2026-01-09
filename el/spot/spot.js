class U2spot extends HTMLElement {
    constructor() {
        super();
        this.targetSelector = this.getAttribute('target') || '*';
        this.activeSelector = this.getAttribute('active') || ':hover';
        this.fallbackSelector = this.getAttribute('fallback') || null;
        this.parent = this.parentElement;
        this.currentTarget = null;
        this.resizeObserver = new ResizeObserver(() => this.updatePosition());
    }

    connectedCallback() {
        ['mouseover', 'mouseout', 'focusin', 'focusout', 'click'].forEach(evt =>
            this.parent.addEventListener(evt, this)
        );
        this.reset();
        this.resizeObserver.observe(this.parent);
    }

    handleEvent(e) {
        const el = e.target.closest(this.targetSelector);
        if (el === this.parentElement) return;

        if (el && el.matches(this.activeSelector)) {
            this.moveTo(el);
            return;
        }
        // sonst prüfen, ob noch irgendein Element matcht
        const match = this.parent.querySelector(`${this.targetSelector}${this.activeSelector}`);
        if (match) this.moveTo(match);
        else this.reset();
    }


    moveTo(el) {
        clearTimeout(this._currentTimeout);
        this.style.opacity = 1;
        if (this.currentTarget === el) return; // Redundante Updates vermeiden
        this._anchorTo(el) || this._positionTo(el);
        this.style.setProperty('--target-border-radius', getComputedStyle(el).borderRadius);
        this.currentTarget = el;
    }
    _anchorTo(el) {
        if (!CSS.supports('position-anchor', '--test')) return false;
        el.style.anchorName ||= `--${el.id || Math.random().toString(36).slice(2, 5)}`;
        this._setCss(()=>{
            this.style.positionAnchor = el.style.anchorName;
        });
        return true;
    }
    _positionTo(el){
        const parent = this.offsetParent; // || document.body;
        const parentRect = parent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        this.style.width = elRect.width + 'px';
        this.style.height = elRect.height + 'px';
        this.style.top = '0px';
        this.style.left = '0px';

        const parentStyle = getComputedStyle(parent);
        const marginLeft = parseFloat(parentStyle.marginLeft) || 0;
        const marginTop = parseFloat(parentStyle.marginTop) || 0;

        const x = elRect.left - parentRect.left + marginLeft;
        const y = elRect.top - parentRect.top + marginTop;

        this._setCss(()=>{
            this.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
    }
    _setCss(fn){
        if (this.currentTarget == null) {
            const prev = this.style.transition;
            this.style.transition = 'none';
            fn();
            this.offsetHeight; // Reflow
            this.style.transition = prev;
        } else {
            fn();
        }
    }
    reset() {
        clearTimeout(this._currentTimeout);

        const fallbackEl = this.fallbackSelector ? this.parent.querySelector(this.fallbackSelector) : null;
        if (fallbackEl) this.moveTo(fallbackEl);
        else {
            this.style.opacity = 0;
            this._currentTimeout = setTimeout(()=> this.currentTarget = null, 400);
        }
    }

    updatePosition() {
        if (this.currentTarget) this.moveTo(this.currentTarget);
    }

    disconnectedCallback() {
        ['mouseover', 'mouseout', 'focusin', 'focusout', 'click'].forEach(evt =>
            this.parent.removeEventListener(evt, this, true)
        );
        this.resizeObserver?.disconnect();
        this.parent = null;
    }
}

customElements.define('u2-spot', U2spot);
