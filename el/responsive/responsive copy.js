class U2Responsive extends HTMLElement {
    constructor() {
        super();
        this._internals = this.attachInternals();
        this.currentLevel = -1;
        this.lastWidth = Infinity;
        //this.updating = false;
        this.resizeObserver = new ResizeObserver(() => this.updateStrategy());
    }

    connectedCallback() { this.resizeObserver.observe(this); }
    disconnectedCallback() { this.resizeObserver.disconnect(); }

    get strategies() { return this.getAttribute('strategies')?.trim().split(/\s+/) || []; }

    applyStrategy(type, strategy) {
        const event = new CustomEvent(`u2-responsive-strategy-${type}`, {
            detail: { strategy },
            bubbles: true,
            cancelable: true
        });
        this.dispatchEvent(event) && this._internals.states[type==='add'?'add':'delete'](strategy);
        // Wait for potential DOM changes //await new Promise(resolve => requestAnimationFrame(resolve));
    }
    applyStrategies(level) {
        const strats = this.strategies;
        const current = new Set(this._internals.states);
        const target  = new Set(strats.slice(0, level + 1));
        // Remove strategies that should be removed
        for (const s of current) !target .has(s) && this.applyStrategy('remove', s);
        // Add strategies that should be added
        for (const s of target ) !current.has(s) && this.applyStrategy('add', s);
    }

    updateStrategy() {
        //if (this.updating) return;
        //this.updating = true;

        const width = this.clientWidth;
        const strats = this.strategies;
        const shrinking = width < this.lastWidth; // need every pixel while shrinking
        const growing = !shrinking; // need every pixel while shrinking
        //const growing = width > this.lastWidth + 2; // save resources by not taking every pixel into account while growing, todo, track lastGrowinWidth?
        this.lastWidth = width;

        if (growing) { // Growing: try to remove strategies
            while (this.currentLevel >= 0) {
                this.applyStrategies(this.currentLevel - 1);
                if (this.scrollWidth > this.clientWidth) { // Doesn't fit, revert
                    this.applyStrategies(this.currentLevel);
                    break;
                }
                this.currentLevel--;
            }
        }
        if (shrinking) { // Shrinking: apply strategies
            while (this.scrollWidth > this.clientWidth && this.currentLevel < strats.length - 1) {
                this.currentLevel++;
                this.applyStrategies(this.currentLevel);
            }
        }
        //this.updating = false;
    }

}

customElements.define('u2-responsive', U2Responsive);