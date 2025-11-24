class ElementVariableStyler extends HTMLElement {
    constructor() {
        super();
        this.targetElement = this.getStyleTarget();
        
        // Definition der zu steuernden Variablen - NUR Font Size in 'px', der Rest in 'rem'
        // Gruppen werden nun mit 'isGroup: true' markiert und enthalten 'children'
        this.variables = [
            { name: '--color', label: 'Akzentfarbe', type: 'color', value: '#007bff' },
            { name: '--width', label: 'Layout Breite (rem)', min: 40, max: 120, step: 1, unit: 'rem', value: 75 },
            
            // Verschachtelte Gruppe: Schatten-Parameter mit Details/Summary
            { 
                label: 'Schatten Einstellungen (rem)',
                isGroup: true,
                // Die Kinderliste muss in 'children' enthalten sein, um die Logik zu vereinfachen
                children: [
                    { name: '--shadow-x', label: 'Versatz X', min: -0.5, max: 2, step: 0.05, unit: 'rem', value: 0 },
                    { name: '--shadow-x', label: 'Versatz X', min: -0.5, max: 2, step: 0.05, unit: 'rem', value: 0 },
                    { name: '--shadow-y', label: 'Versatz Y', min: -0.5, max: 2, step: 0.05, unit: 'rem', value: 0.3 },
                    { name: '--shadow-blur', label: 'Unschärfe', min: 0, max: 2, step: 0.1, unit: 'rem', value: 0.6 }
                ]
            },
            
            // Native CSS Eigenschaft (ohne --) - Beibehalten wie gewünscht
            { name: 'font-size', label: 'Schriftgröße (px)', min: 10, max: 24, step: .2, unit: 'px', value: 16 },
            
            // Einzelne Variablen
            { name: '--radius', label: 'Border Radius (rem)', min: 0, max: 2, step: 0.1, unit: 'rem', value: 0.5 },
            { name: '--line-width', label: 'Linienstärke (rem)', min: 0.05, max: 0.3, step: 0.01, unit: 'rem', value: 0.0625 } 
        ];

        this.attachShadow({ mode: 'open' });
        this.render();
    }

    getStyleTarget() {
        const targetSelector = this.getAttribute('target');
        if (targetSelector) {
            return document.querySelector(targetSelector) || document.documentElement;
        }
        return document.documentElement;
    }

    // Hilfsfunktion zur Erzeugung eines einzelnen Steuerelements
    createControlHtml(v) {
        const isRange = v.type !== 'color';
        const valueDisplayId = v.name.replace('--', '') + '-value';

        return `
            <div class="control-group">
                <label for="${v.name}">
                    ${v.label}
                    <span class="value-display" id="${valueDisplayId}">
                        ${v.value}${v.unit || ''}
                    </span>
                </label>
                <input 
                    type="${v.type || 'range'}" 
                    id="${v.name}" 
                    name="${v.name}" 
                    ${isRange ? `min="${v.min}" max="${v.max}" step="${v.step}"` : ''} 
                    value="${v.value}"
                    data-unit="${v.unit || ''}"
                >
            </div>
        `;
    }

    render() {
        const style = `
            :host {
                font:unset !important;
                font-size:14px !important;
                display: block;
                position: fixed;
                top: 0.625em;
                right: 0.625em;
                background: white;
                border: 1px solid #ccc;
                padding: 0.625em !important;
                border-radius: 0.5em; 
                z-index: 9999;
                box-shadow: 0 0.25em 0.75em rgba(0,0,0,0.1); 
            }
            .styler-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 0.6em; 
            }
            .control-group {
                display: flex;
                flex-direction: column;
                margin-bottom: 0.3em; /* Abstand zwischen einzelnen Controlls */
            }
            label {
                font-family: sans-serif;
                font-size: 0.8em;
                font-weight: bold;
                display:flex;
            }
            input[type="range"] {
                margin:0;
                width: 100%;
            }
            .value-display {
                font-family: monospace;
                font-size: 0.75em;
                color: #555;
                margin-left:auto;
            }
            
            /* Styling für die Details-Gruppe */
            details {
                border: 1px solid #eee;
                border-radius: 0.3em;
                padding: 0.2em 0.5em;
            }
            summary {
                font-weight: bold;
                padding: 0.2em 0;
                cursor: pointer;
                outline: none;
                list-style: none; /* Entfernt den Standardpfeil */
                font-size: 0.8em;
            }
            summary::marker {
                content: none; /* Entfernt Marker in Browsern, wo list-style:none nicht reicht */
            }
            /* Fügt manuellen Chevron-Pfeil hinzu */
            summary::before {
                content: '▶'; 
                display: inline-block;
                margin-right: 0.5em;
                transition: transform 0.2s;
                font-size: 0.7em;
            }
            details[open] > summary::before {
                transform: rotate(90deg);
            }
            .details-content {
                display: grid;
                gap: 0.6em;
                margin-top: 0.5em; /* Abstand nach Summary */
            }
        `;

        let controls = '';
        
        this.variables.forEach(v => {
            if (v.isGroup && v.children && Array.isArray(v.children)) {
                // Dies ist eine verschachtelte, klappbare Gruppe (Details/Summary)
                const childrenHtml = v.children.map(child => this.createControlHtml(child)).join('');
                
                controls += `
                    <details class="control-group-nested">
                        <summary>${v.label}</summary>
                        <div class="details-content">
                            ${childrenHtml}
                        </div>
                    </details>
                `;
            } else {
                // Dies ist ein einzelnes Steuerelement
                controls += this.createControlHtml(v);
            }
        });


        this.shadowRoot.innerHTML = `
            <style>${style}</style>
            <div class="styler-grid">${controls}</div>
        `;

        this.shadowRoot.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', this.handleInput.bind(this));
            // Die setInitialValue-Methode muss für alle Inputs, auch in Subgruppen, aufgerufen werden
            this.setInitialValue(input); 
            
            // Finde die Gruppe (details) für das Input-Element und öffne sie, falls der Wert != Standard ist
            if (input.name.startsWith('--shadow-')) {
                const groupDetails = input.closest('details');
                const initialValue = parseFloat(input.value);
                // Annahme: Wenn x, y oder blur nicht 0 ist, ist die Gruppe relevant und sollte offen sein
                if (groupDetails && initialValue !== 0 && initialValue !== 0.3) {
                     //groupDetails.open = true;
                }
            }
        });
    }
    
    // setInitialValue, handleInput, applyVariable bleiben funktional unverändert
    
    setInitialValue(input) {
        const targetValue = this.targetElement.style.getPropertyValue(input.name) || 
                            getComputedStyle(this.targetElement).getPropertyValue(input.name).trim();

        if (targetValue) {
            const unit = input.dataset.unit || '';
            const numericValue = parseFloat(targetValue.replace(unit, ''));
            
            if (!isNaN(numericValue) && input.type === 'range') {
                input.value = numericValue;
            } else if (input.type === 'color') {
                 input.value = targetValue;
            }
            
            const valueDisplayId = input.name.replace('--', '') + '-value';
            const displayElement = this.shadowRoot.getElementById(valueDisplayId);
            if (displayElement) {
                displayElement.textContent = targetValue;
            }
        }

        this.applyVariable(input.name, input.value, input.dataset.unit);
    }


    handleInput(event) {
        const input = event.target;
        const value = input.value;
        const unit = input.dataset.unit || '';
        const variableName = input.name;
        
        this.applyVariable(variableName, value, unit);
    }
    
    applyVariable(variableName, value, unit) {
        const fullValue = value + unit;
        this.targetElement.style.setProperty(variableName, fullValue);

        const valueDisplayId = variableName.replace('--', '') + '-value';
        const displayElement = this.shadowRoot.getElementById(valueDisplayId);
        if (displayElement) {
            displayElement.textContent = fullValue;
        }
    }
}

customElements.define('element-variable-styler', ElementVariableStyler);