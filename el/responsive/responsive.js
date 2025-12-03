class U2Responsive extends HTMLElement {
    constructor() {
        super();
        this._internals = this.attachInternals();
        this.currentLevel = 0;
        this.lastWidth = Infinity;
        this.criticalWidths = new Map();
        this.resizeObserver = new ResizeObserver(() => this.updateStrategy());
    }
    
    static observedAttributes = ['mutation'];

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'mutation') setMutationObserver(this, newValue !== null);
    }
    connectedCallback() {
        this.resizeObserver.observe(this);
        setMutationObserver(this, this.getAttribute('mutation') !== null);
    }
    disconnectedCallback() {
        this.resizeObserver.disconnect();
        setMutationObserver(this, false);
    }

    get strategies() { 
        return this.getAttribute('strategies')?.trim().split(/\s+/) 
            || ['overflow-1','overflow-2','overflow-3','overflow-4','overflow-5','overflow-6']
    }

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
        const target  = new Set(strats.slice(0, level));
        for (const s of current) !target .has(s) && this.applyStrategy('remove', s); // Remove strategies
        for (const s of target ) !current.has(s) && this.applyStrategy('add', s); // Add strategies
    }

    updateStrategy() {
        const width = this.clientWidth;
        const strats = this.strategies;
         
        let growing = width > this.lastWidth;
        this.lastWidth = width;

        // debounce, not test every growing pixel if criticalWidth is known
        if (growing && this.currentLevel > 0) {
            const criticalWidth = this.criticalWidths.get(this.currentLevel-1);
            let margin = 0;
            if (criticalWidth !=null) {
                const distanceToCritical = criticalWidth - width;
                margin = Math.max(0, distanceToCritical / 1);
            }
            const growCheck = width > this.lastGrowingCheckAt + margin;

            if (growCheck) {
                this.lastGrowingCheckAt = width; // reset by trying
                this.applyStrategies(--this.currentLevel); // try
            }

        } else {
            this.lastGrowingCheckAt = width; // reset by shrinking
        }

        while (this.scrollWidth > this.clientWidth && this.currentLevel < strats.length) { // while it overflows (and has more strategies left)
            if (!growing) this.criticalWidths.set(this.currentLevel, width);
            this.applyStrategies(++this.currentLevel);
        }
    }

    debug(){
        const div = document.createElement('div');
        document.body.appendChild(div);

        setInterval(()=>{
            const position = this.getBoundingClientRect();
            div.style.cssText = `background:#999; position:absolute; top:${position.top-20}px; left:${position.left}px; width:${position.width}px; height:7px; font-size:11px`;

            this.strategies.forEach((name, level) => {
                const expectedWidth = this.criticalWidths.get(level);
                const id = 'debugMarker'+level;
                const marker = div.querySelector('#'+id) || document.createElement('div');
                marker.id = id;
                marker.style.cssText = `position:absolute; width:2px; height:20px; background:red; white-space:nowrap;`;
                marker.innerHTML = 
                    `<div style="position:absolute; left:-20px; bottom:20px; line-height:1.1; background:#fff7; padding:.3em; writing-mode:sideways-lr">
                        ${name}<br> level: ${level+1}
                    </div>`;

                if (expectedWidth) {
                    marker.style.left = expectedWidth+'px';
                    marker.style.top = '-10px';
                } else {
                    marker.style.left = '-20px'; 
                    marker.style.top = '-120px';
                }
                
                div.append(marker);
            });

            const tryGrowingAt = this.lastGrowingCheckAt;
            if (tryGrowingAt) {
                const marker = div.querySelector('#tryGrowingAt') || document.createElement('div');
                marker.id = 'tryGrowingAt';
                marker.style.cssText = `position:absolute; width:2px; height:20px; background:blue; white-space:nowrap; text-aligen:center`;
                marker.style.left = tryGrowingAt+'px';
                marker.style.top = '-10px';
                div.append(marker);
            }

            
        },20);

    }
}

customElements.define('u2-responsive', U2Responsive);



function setMutationObserver(el, active){
    if (active) {
        el.mutationObserver ??= new MutationObserver(() => {
            el.lastWidth = 0; // Force re-check for shrinking
            el.lastGrowingCheckAt = null; // Force re-check for growing
            el.updateStrategy()
        });
        el.mutationObserver.observe(el, {  childList: true,  subtree: true,  characterData: true, attributes: true });
    } else {
        el.mutationObserver?.disconnect();
        el.mutationObserver = null;
    }
}

