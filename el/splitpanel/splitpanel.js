
class splitpanel extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <style>
            #slots {
                display: contents;
            }
            #slots > :last-child {
                display: none;
            }
            .divider {
                --size: .5em;
                min-height: var(--size);                           
                min-width: var(--size);
                flex: 0 0 auto;
                background: var(--divider-color, #ccc);
                cursor: col-resize;
            }
            :host([vertical]) .divider {
                cursor: row-resize;
            }
            </style>
            <div id=slots></div>
        `;
        this.slotsEl = this.shadowRoot.getElementById('slots');


        // dragging:
        // - when start dragging all children should have a flex-basis in percent
        // - when dragging the divider, the previous and next child should be resized
        // <u2-splitpanel>
        //   <div style="flex-basis:20%">1</div>
        //   <div style="flex-basis:20%">2</div>
        //   <div style="flex-basis:60%">3</div>
        // </u2-splitpanel>

        this.shadowRoot.addEventListener('pointerdown', (event) => {
            if (!event.target.classList.contains('divider')) return;
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
        
            const newPreviousSize = position - (this.previousPanel.getBoundingClientRect()[this.hasAttribute('vertical') ? 'top' : 'left'] - rect[this.hasAttribute('vertical') ? 'top' : 'left']);
            const newNextSize = totalSize - newPreviousSize;
        
            this.previousPanel.style.flexBasis = `${(newPreviousSize / totalSize * 100).toFixed(2)}%`;
            this.nextPanel.style.flexBasis = `${(newNextSize / totalSize * 100).toFixed(2)}%`;
        });
        this.shadowRoot.addEventListener('pointerup', () => {
            this.isDragging = false;
        });
        this.shadowRoot.addEventListener('lostpointercapture', () => {
            this.isDragging = false;
        });
    }
    
    connectedCallback() {
        // create a slot for each child and direct that child to the slot
        [...this.children].forEach((child, nr) => {
            const slot = document.createElement('slot');
            slot.name = nr;
            this.slotsEl.appendChild(slot);
            child.setAttribute('slot', nr);
            const divider = document.createElement('div');
            divider.classList.add('divider');
            divider.role = 'separator';
            divider.part = 'divider';
            this.slotsEl.appendChild(divider);
        });

    }
}

customElements.define('u2-splitpanel', splitpanel);
