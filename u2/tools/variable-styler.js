class ElementVariableStyler extends HTMLElement {
    constructor() {
        super();
        this.targetElement = this.getStyleTarget();
        
        // Definition der zu steuernden Variablen - NUR Font Size in 'px', der Rest in 'rem'
        // Gruppen werden nun mit 'isGroup: true' markiert und enthalten 'children'
        this.variables = [
            { name: '--color', label: 'Akzentfarbe', type: 'color', value: '#007bff' },
            { name: '--width', label: 'Layout Breite (rem)', min: 40, max: 120, step: 1, unit: 'rem', value: 75 },
            { 
                label: 'Schatten Einstellungen (rem)',
                isGroup: true,
                children: [
                    { name: '--shadow-x', label: 'Versatz X', min: -0.5, max: 2, step: 0.05, unit: 'rem', value: 0 },
                    { name: '--shadow-y', label: 'Versatz Y', min: -0.5, max: 2, step: 0.05, unit: 'rem', value: 0.3 },
                    { name: '--shadow-blur', label: 'Unschärfe', min: 0, max: 2, step: 0.1, unit: 'rem', value: 0.6 }
                ]
            },
            { name: 'font-size', label: 'Schriftgröße (px)', min: 10, max: 24, step: .2, unit: 'px', value: 16 },
            { 
                label: 'Schrift einstellungen',
                isGroup: true,
                children: [
                    { name: '--line-height-relative', label: 'Linienhöhe in abhängikeit zur aktuellen Schritgrösse', min: 0, max: 2, step: 0.001, unit: 'em', value: 1 },
                    { name: '--line-height-absolute', label: 'Linienhöhe globaler Anteil (auf addiert)', min: 0, max: 1, step: 0.001, unit: 'rem', value: .5 }
                ]
            },
            { name: '--radius', label: 'Border Radius (rem)', min: 0, max: 2, step: 0.1, unit: 'rem', value: 0.5 },
            { name: '--line-width', label: 'Linienstärke (rem)', min: 0.05, max: 0.3, step: 0.01, unit: 'rem', value: 0.0625 } 
        ];

        this.attachShadow({ mode: 'open' });
        this.render();
    }

    getStyleTarget() {
        const selector = this.getAttribute('target');
        if (selector) {
            return document.querySelector(selector) || document.documentElement;
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
                color:black;
                display: block;
                max-width:17em;
                position: fixed;
                top: 0.625em;
                right: 0.625em;
                background: white;
                border: 1px solid #ccc;
                padding: 0.625em !important;
                border-radius: 0.5em; 
                z-index: 9999;
                box-shadow: 0 0.25em 0.75em rgba(0,0,0,0.1); 
                line-height:1.2 !important;
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
                white-space:nowrap;
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
        // const targetValue = this.targetElement.style.getPropertyValue(input.name) || 
        //                     getComputedStyle(this.targetElement).getPropertyValue(input.name).trim();

        const elValue = getComputedStyle(this.targetElement).getPropertyValue(input.name).trim();

        console.log(input.name, elValue)
        
        

        if (elValue) {
            const inpUnit = input.dataset.unit || '';

            if (input.type === 'range') {
                const {unit:elUnit, value:elNumber} = parseCssLength(elValue)
                const elPx = unitToPx(elNumber, elUnit, this.targetElement);
                const inpNumber = pxToUnit(elPx, inpUnit, this.targetElement);
                input.value = inpNumber;
            } else if (input.type === 'color') {
                input.value = elValue;
            }
            
            const valueDisplayId = input.name.replace('--', '') + '-value';
            const displayElement = this.shadowRoot.getElementById(valueDisplayId);
            if (displayElement) {
                displayElement.textContent = elValue;
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


function parseCssLength(str) {
    const match = /^(\d*\.?\d+)([a-z%]*)$/.exec(str);
    return match ? { value: parseFloat(match[1]), unit: match[2] || '' } : { value: NaN, unit: '' };
}

function unitToPx(value, unit, el){
    if (unit === 'px') return value;
    if (unit === 'cm') return value * 96 / 2.54;
    if (unit === 'mm') return value * 96 / 25.4;
    if (unit === 'in') return value * 96;
    if (unit === 'pt') return value * 96 / 72;
    if (unit === 'pc') return value * 96 / 6;
    if (unit === 'rem') return value * parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (unit === 'em') return value * parseFloat(getComputedStyle(el).fontSize);
    if (unit === 'vw') return value * (innerWidth / 100);
    if (unit === 'vh') return value * (innerHeight / 100);
    if (unit === '%') {
        console.warn('todo: "%" is dependant of the css-property used');
        return null;
        // return value * el.parentElement.offsetWidth / 100;
    }
    if (unit === 'lh') {
        const raw = getComputedStyle(el).lineHeight;
        if (raw === 'normal') {
            console.warn('lh is "normal" which is not easy to pixelize');
            return null;
        }
        const lh = parseFloat(raw);
        return value * lh;
    }

    console.warn(`Unknown unit: ${unit}`);
    return null;
}

function pxToUnit(px, unit, el){
    if (unit === 'px')  return px;
    if (unit === 'cm')  return px * 2.54 / 96;
    if (unit === 'mm')  return px * 25.4 / 96;
    if (unit === 'in')  return px / 96;
    if (unit === 'pt')  return px * 72 / 96;
    if (unit === 'pc')  return px * 6 / 96;
    if (unit === 'rem') return px / parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (unit === 'em')  return px / parseFloat(getComputedStyle(el).fontSize); // not el.parentNode
    if (unit === 'vw')  return px / (innerWidth / 100);
    if (unit === 'vh')  return px / (innerHeight / 100);
    if (unit === '%')   {
        console.warn('todo: "%" is dependant of the css-property used');
        return null;
        //return px * 100 / el.parentElement.offsetWidth;
    }
    if (unit === 'lh')   {
        const raw = getComputedStyle(el).lineHeight;
        if (raw === 'normal') {
            console.warn('lh is "normal" which is not easy to pixelize');
            return null;
        }
        const lh = parseFloat(raw);
        return px / lh;    
    }
}
