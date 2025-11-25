class U2Responsive extends HTMLElement {
    constructor() {
        super();
        this._internals = this.attachInternals();
        this.currentLevel = -1;
        this.lastWidth = 0;
        this.updating = false;
        this.resizeObserver = new ResizeObserver(() => this.updateStrategy());
    }

    connectedCallback() {
        this.resizeObserver.observe(this);
        requestAnimationFrame(() => this.updateStrategy());
    }

    disconnectedCallback() {
        this.resizeObserver.disconnect();
    }

    get strategies() {
        return this.getAttribute('strategies')?.trim().split(/\s+/) || [];
    }

    async applyStrategies(level) {
        const strats = this.strategies;
        const currentActive = new Set([...this._internals.states]);
        const targetActive = new Set(strats.slice(0, level + 1));

        // Remove strategies that should be removed
        for (const strategy of currentActive) {
            if (!targetActive.has(strategy)) {
                const event = new CustomEvent('u2-responsive-strategy-remove', {detail: {strategy}, bubbles:true, cancelable:true});
                const allowed = this.dispatchEvent(event);
                if (allowed) this._internals.states.delete(strategy);
                // Wait for potential DOM changes //await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }

        // Add strategies that should be added
        for (const strategy of targetActive) {
            if (!currentActive.has(strategy)) {
                const event = new CustomEvent('u2-responsive-strategy-add', {detail: {strategy}, bubbles:true, cancelable:true});
                const allowed = this.dispatchEvent(event);
                if (allowed) this._internals.states.add(strategy);
                // Wait for potential DOM changes //await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }
    }

    async updateStrategy() {
        if (this.updating) return;
        this.updating = true;

        const width = this.clientWidth;
        const strats = this.strategies;
        const growing = width > this.lastWidth;
        this.lastWidth = width;

        if (growing) { // Growing: try to remove strategies
            while (this.currentLevel >= 0) {
                await this.applyStrategies(this.currentLevel - 1);
                if (this.scrollWidth > this.clientWidth) { // Doesn't fit, revert
                    await this.applyStrategies(this.currentLevel);
                    break;
                }
                this.currentLevel--;
            }
        } else { // Shrinking: apply strategies
            while (this.scrollWidth > this.clientWidth && this.currentLevel < strats.length - 1) {
                this.currentLevel++;
                await this.applyStrategies(this.currentLevel);
            }
        }
        this.updating = false;
    }

}

customElements.define('u2-responsive', U2Responsive);