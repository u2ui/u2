class U2Fields extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open', slotAssignment: 'manual' });
        import('../responsive/responsive.js');

        this.shadowRoot.innerHTML = `
            <style>
                /* Minimales Layout */
                :host {
                    margin-block:.5rem;
                    white-space:nowrap;
                }
                u2-responsive {
                    display: grid;
                    align-items:baseline;
                    grid-template-columns: auto 1fr;
                    gap:.5rem 1rem;

                    label { display: contents; }

                    slot[part=label] {
                        display:block;
                    }
                    slot[part=input] {
                        display:flex;
                        &::slotted(*) {
                            flex:1 0 auto;
                        }
                    }

                    &:state(forceTop) {
                        text-align:left;
                        grid-template-columns: 1fr;
                        label { display: block; min-width: 0; }
                        &::slotted(*) {
                            flex:1 1 auto;
                        }
                    }
                
                }
            </style>
            <u2-responsive strategies="forceTop" id="container"></u2-responsive>
        `;

        this.container = this.shadowRoot.getElementById('container');
        this.observer = new MutationObserver(this.processChildren.bind(this));
    }

    connectedCallback() {
        // Observer lauscht auf alle Kindknoten der Komponente
        this.observer.observe(this, { childList: true });
        this.processChildren();
    }

    disconnectedCallback() {
        this.observer.disconnect();
    }

    processChildren() {
        const lightDomNodes = Array.from(this.childNodes).filter(node => 
            node.nodeType !== Node.COMMENT_NODE && 
            !(node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '')
        );
        
        let currentLabelContent = [];
        this.container.innerHTML = ''; 
        const assignments = [];

        for (const node of lightDomNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && 
                (node.form !== undefined || node.hasAttribute('name'))
            ) {
                assignments.push({
                    labelNodes: currentLabelContent,
                    inputNode: node
                });
                currentLabelContent = [];
            } else {
                currentLabelContent.push(node);
            }
        }
        assignments.forEach(pair => {
            const wrapperLabel = document.createElement('label');
            const labelSlot = document.createElement('slot');
            labelSlot.part = 'label';
            const inputSlot = document.createElement('slot');
            inputSlot.part = 'input';
            wrapperLabel.appendChild(labelSlot);
            wrapperLabel.appendChild(inputSlot);
            this.container.appendChild(wrapperLabel);
            if (pair.labelNodes.length > 0) {
                labelSlot.assign(...pair.labelNodes);
            } else {
                const attr = ['aria-label','title','name', 'type'].find(a => pair.inputNode.hasAttribute(a));
                if (attr) {
                    labelSlot.textContent = pair.inputNode.getAttribute(attr);
                }
            }
            pair.inputNode.ariaLabelledByElements = [wrapperLabel]; // not working... why?
            inputSlot.assign(pair.inputNode);
        });
    }
}

customElements.define('u2-fields', U2Fields);