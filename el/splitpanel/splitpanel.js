
class splitpanel extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <style>
            #slots {
                display: contents;
            }
            #slots > :is(:first-child, :last-child) {
                display: none;
            }
            [role=separator] {
                display:flex;
                align-items:center;
                justify-content:center;
                position:relative;
                --size: .5em;
                min-height: var(--size);
                min-width: var(--size);
                flex: 0 0 auto;
                background: #ccc;
                cursor: col-resize;
                z-index:1;
                touch-action: none;
            }
            [role=separator]:hover {
                z-index:2;
            }
            :host([vertical]) [role=separator] {
                cursor: row-resize;
            }
            </style>
            <div id=slots></div>
        `;
        this.slotsEl = this.shadowRoot.getElementById('slots');

        this.shadowRoot.addEventListener('pointerdown', (event) => {
            if (!event.target.part.contains('divider')) return;
            this.isDragging = true;
            this.draggingDivider = event.target;
            this.draggingDivider.setPointerCapture(event.pointerId);
            this.previousPanel = this.draggingDivider.previousElementSibling.assignedNodes()[0];
            this.nextPanel = this.draggingDivider.nextElementSibling.assignedNodes()[0];

            // set flex-basis for all children
            const children = [...this.children];
            let total = 0;
            children.forEach((child) => {
                const size = this.hasAttribute('vertical') ? child.clientHeight : child.clientWidth;
                total += size;
                requestAnimationFrame(() => {
                    child.style.flexBasis = `${size / total * 100}%`;
                });
            });
        });


        this.shadowRoot.addEventListener('pointermove', (event) => {
            if (!this.isDragging) return;
            const rect = this.getBoundingClientRect();
            const position = this.hasAttribute('vertical') ? event.clientY - rect.top : event.clientX - rect.left;
            const previousSize = this.hasAttribute('vertical') ? this.previousPanel.clientHeight : this.previousPanel.clientWidth;
            const nextSize = this.hasAttribute('vertical') ? this.nextPanel.clientHeight : this.nextPanel.clientWidth;
            const totalSize = previousSize + nextSize;
            const totalPercentage = parseFloat(this.previousPanel.style.flexBasis) + parseFloat(this.nextPanel.style.flexBasis);
        
            const newPreviousSize = position - (this.previousPanel.getBoundingClientRect()[this.hasAttribute('vertical') ? 'top' : 'left'] - rect[this.hasAttribute('vertical') ? 'top' : 'left']);
            const newNextSize = totalSize - newPreviousSize;

            const prevPercent = newPreviousSize / totalSize * totalPercentage;
            const nextPercent = newNextSize / totalSize * totalPercentage;

            this.previousPanel.style.flexBasis = `${prevPercent.toFixed(2)}%`;
            this.nextPanel.style.flexBasis = `${nextPercent.toFixed(2)}%`;
        
        });
        this.shadowRoot.addEventListener('pointerup', () => {
            this.isDragging = false;
        });
        this.shadowRoot.addEventListener('lostpointercapture', () => {
            this.isDragging = false;
        });


        this.observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    this.assignChildren();
                }
            });
        });        
    }
    
    connectedCallback() {
        // create a slot for each child and direct that child to the slot
        this.assignChildren();
        this.observer.observe(this, {childList: true});
    }
    disconnectedCallback() {
        this.observer.disconnect();
    }
    assignChildren() {
        let html = '<div role="separator" part="divider" class="divider-0"></div>';
        [...this.children].forEach((child, index) => {
            const nr = index + 1;
            child.slot = nr;
            html += `<slot name="${nr}"></slot><div role="separator" part="divider" class="divider-${nr}"></div>`;
        });
        this.slotsEl.innerHTML = html;
    }
}

customElements.define('u2-splitpanel', splitpanel);
