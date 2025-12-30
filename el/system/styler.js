const FONTS = {
    system: {
        label: 'System UI',
        stack: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    // SANS-SERIF
    inter: {
        label: 'Inter',
        google: 'Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900',
        stack: "'Inter', sans-serif"
    },
    'roboto-flex': {
        label: 'Roboto Flex',
        google: 'Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000',
        stack: "'Roboto Flex', sans-serif"
    },
    'open-sans': {
        label: 'Open Sans',
        google: 'Open+Sans:ital,wdth,wght@0,75..100,300..800;1,75..100,300..800',
        stack: "'Open Sans', sans-serif"
    },
    'source-sans-3': {
        label: 'Source Sans 3',
        google: 'Source+Sans+3:ital,wght@0,200..900;1,200..900',
        stack: "'Source Sans 3', sans-serif"
    },
    'work-sans': {
        label: 'Work Sans',
        google: 'Work+Sans:ital,wght@0,100..900;1,100..900',
        stack: "'Work Sans', sans-serif"
    },
    'public-sans': {
        label: 'Public Sans',
        google: 'Public+Sans:ital,wght@0,100..900;1,100..900',
        stack: "'Public Sans', sans-serif"
    },
    'plus-jakarta-sans': {
        label: 'Plus Jakarta Sans',
        google: 'Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800',
        stack: "'Plus Jakarta Sans', sans-serif"
    },
    'manrope': {
        label: 'Manrope',
        google: 'Manrope:wght@200..800',
        stack: "'Manrope', sans-serif"
    },
    'nunito': {
        label: 'Nunito',
        google: 'Nunito:ital,wght@0,200..1000;1,200..1000',
        stack: "'Nunito', sans-serif"
    },
    'dm-sans': {
        label: 'DM Sans',
        google: 'DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000',
        stack: "'DM Sans', sans-serif"
    },
    rubik: {
        label: 'Rubik',
        google: 'Rubik:ital,wght@0,300..900;1,300..900',
        stack: "'Rubik', sans-serif"
    },
    montserrat: {
        label: 'Montserrat',
        google: 'Montserrat:ital,wght@0,100..900;1,100..900',
        stack: "'Montserrat', sans-serif"
    },
    epilogue: {
        label: 'Epilogue',
        google: 'Epilogue:ital,wght@0,100..900;1,100..900',
        stack: "'Epilogue', sans-serif"
    },
    lexend: {
        label: 'Lexend',
        google: 'Lexend:wght@100..900',
        stack: "'Lexend', sans-serif"
    },
    sora: {
        label: 'Sora',
        google: 'Sora:wght@100..800',
        stack: "'Sora', sans-serif"
    },
    commissioner: {
        label: 'Commissioner',
        google: 'Commissioner:wght@100..900',
        stack: "'Commissioner', sans-serif"
    },
    'space-grotesk': {
        label: 'Space Grotesk',
        google: 'Space+Grotesk:wght@300..700',
        stack: "'Space Grotesk', sans-serif"
    },
    quicksand: {
        label: 'Quicksand',
        google: 'Quicksand:wght@300..700',
        stack: "'Quicksand', sans-serif"
    },
    cabin: {
        label: 'Cabin',
        google: 'Cabin:ital,wdth,wght@0,75..100,400..700;1,75..100,400..700',
        stack: "'Cabin', sans-serif"
    },
    outfit: {
        label: 'Outfit',
        google: 'Outfit:wght@100..900',
        stack: "'Outfit', sans-serif"
    },
    'red-hat-display': {
        label: 'Red Hat Display',
        google: 'Red+Hat+Display:ital,wght@0,300..900;1,300..900',
        stack: "'Red Hat Display', sans-serif"
    },
    heebo: {
        label: 'Heebo',
        google: 'Heebo:wght@100..900',
        stack: "'Heebo', sans-serif"
    },
    karla: {
        label: 'Karla',
        google: 'Karla:ital,wght@0,200..800;1,200..800',
        stack: "'Karla', sans-serif"
    },
    'ibm-plex-sans': {
        label: 'IBM Plex Sans',
        google: 'IBM+Plex+Sans:ital,wght@0,100..700;1,100..700',
        stack: "'IBM Plex Sans', sans-serif"
    },
    'instrument-sans': {
        label: 'Instrument Sans',
        google: 'Instrument+Sans:ital,wght@0,400..700;1,400..700',
        stack: "'Instrument Sans', sans-serif"
    },
    
    // SERIF
    fraunces: {
        label: 'Fraunces',
        google: 'Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900',
        stack: "'Fraunces', serif"
    },
    'crimson-pro': {
        label: 'Crimson Pro',
        google: 'Crimson+Pro:ital,wght@0,200..900;1,200..900',
        stack: "'Crimson Pro', serif"
    },
    'playfair-display': {
        label: 'Playfair Display',
        google: 'Playfair+Display:ital,wght@0,400..900;1,400..900',
        stack: "'Playfair Display', serif"
    },
    'source-serif-4': {
        label: 'Source Serif 4',
        google: 'Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900',
        stack: "'Source Serif 4', serif"
    },
    'cormorant': {
        label: 'Cormorant',
        google: 'Cormorant:ital,wght@0,300..700;1,300..700',
        stack: "'Cormorant', serif"
    },
    'eb-garamond': {
        label: 'EB Garamond',
        google: 'EB+Garamond:ital,wght@0,400..800;1,400..800',
        stack: "'EB Garamond', serif"
    },
    'merriweather': {
        label: 'Merriweather',
        google: 'Merriweather:ital,wght@0,300..900;1,300..900',
        stack: "'Merriweather', serif"
    },
    'literata': {
        label: 'Literata',
        google: 'Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900',
        stack: "'Literata', serif"
    },
    'libre-baskerville': {
        label: 'Libre Baskerville',
        google: 'Libre+Baskerville:ital,wght@0,400..700;1,400..700',
        stack: "'Libre Baskerville', serif"
    },
    'lora': {
        label: 'Lora',
        google: 'Lora:ital,wght@0,400..700;1,400..700',
        stack: "'Lora', serif"
    },
    'rokkitt': {
        label: 'Rokkitt',
        google: 'Rokkitt:ital,wght@0,100..900;1,100..900',
        stack: "'Rokkitt', serif"
    },

    // MONOSPACE
    'jetbrains-mono': {
        label: 'JetBrains Mono',
        google: 'JetBrains+Mono:ital,wght@0,100..800;1,100..800',
        stack: "'JetBrains Mono', monospace"
    },
    recursive: {
        label: 'Recursive',
        google: 'Recursive:slnt,wght,CASL,CRSV,MONO@-15..0,300..1000,0..1,0..1,0..1',
        stack: "'Recursive', monospace"
    },
    'roboto-mono': {
        label: 'Roboto Mono',
        google: 'Roboto+Mono:ital,wght@0,100..700;1,100..700',
        stack: "'Roboto Mono', monospace"
    },
    'source-code-pro': {
        label: 'Source Code Pro',
        google: 'Source+Code+Pro:ital,wght@0,200..900;1,200..900',
        stack: "'Source Code Pro', monospace"
    },
    'fira-code': {
        label: 'Fira Code',
        google: 'Fira+Code:wght@300..700',
        stack: "'Fira Code', monospace"
    },
};


class ColorSystemStyler extends HTMLElement {
    constructor() {
        super();
        this.targetElement = this.getStyleTarget();
        this.popover = 'auto';
        
        this.variables = [
            {
                label: 'Colors',
                children: [
                    { name: '--color', label: 'Basis Farbe', type: 'color', value: '#aa8833' },
                    { name: '--accent', label: 'Akzent Farbe', type: 'color', value: '#33aa88' },
                    {
                        label: 'more...',
                        children: [
                            { 
                                name: '--color-space', 
                                label: 'Farbraum', 
                                type: 'select',
                                options: ['oklch', 'srgb', 'hsl', 'hwb'],
                                value: 'oklch'
                            },
                            { name: '--hue-shift', label: 'Palette adjustment', min: -15, max: 15, step: 1, unit: '', value: 0 }
                        ]
                    }
                ]
            },{
                label: 'Typografie',
                children: [
                    { name: 'font-size', label: 'Schriftgröße', min: 10, max: 24, step: 0.5, unit: 'px', value: 16 },
                    { name: 'font-weight', label: 'Schriftstärke', min: 100, max: 900, step: 1, unit: '', value: 400 },
                    { name: '--line-height-relative', label: 'Zeilenhöhe relativ', min: .7, max: 2, step: 0.01, unit: 'em', value: 1.5 },
                    { name: '--line-height-absolute', label: 'Zeilenhöhe absolut (addiert)', min: 0, max: .5, step: 0.01, unit: 'rem', value: 0.5 },
                    /* { name: '--h-size-ratio', label: 'Heading Size Ratio', min: 1.1, max: 1.6, step: 0.001, unit: '', value: 1.25 }, */
                        {
                        label: 'Haupt Schrift',
                        children: [
                            { name: '--font-1', label: 'Fontfamily', type: 'select', options: Object.keys(FONTS), value: 'system-ui' },
                            { name: '--font-1-wdth', label: 'Schriftbreite (wdth)', min: 25, max: 151, step: 1, unit: '', value: 100 },
                            { name: '--font-1-opsz', label: 'Optical Size (opsz)', min: 8, max: 144, step: 1, unit: '', value: 16 },
                            { name: '--font-1-mono', label: 'Monospace (MONO)', min: 0, max: 1, step: 0.01, value: 0 },
                            { name: '--font-1-casl', label: 'Casual (CASL)', min: 0, max: 1, step: 0.01, value: 0 },
                            { name: '--font-1-grad', label: 'Strichstärke (GRAD)', min: -200, max: 150, step: 1, value: 0 },                            
                        ]
                    },{
                        label: 'Zweit Schrift',
                        children: [
                            { name: '--font-2', label: 'Fontfamily', type: 'select', options: Object.keys(FONTS), value: 'system-ui' },
                            { name: '--font-2-wdth', label: 'Schriftbreite (wdth)', min: 25, max: 151, step: 1, unit: '', value: 100 },
                            { name: '--font-2-opsz', label: 'Optical Size (opsz)', min: 8, max: 144, step: 1, unit: '', value: 16 },
                            { name: '--font-2-mono', label: 'Monospace (MONO)', min: 0, max: 1, step: 0.01, value: 0 },
                            { name: '--font-2-casl', label: 'Casual (CASL)', min: 0, max: 1, step: 0.01, value: 0 },
                            { name: '--font-2-grad', label: 'Strichstärke (GRAD)', min: -200, max: 150, step: 1, value: 0 },                            
                        ]
                    }

                    
                ]
            },{ 
                label: 'Layout',
                children: [
                    { name: '--width', label: 'Content Breite', min: 20, max: 100, step: 1, unit: 'rem', value: 50 },
                    { name: '--radius', label: 'Border Radius', min: 0, max: 2, step: 0.05, unit: 'rem', value: 0.3 },
                    { name: '--line-width', label: 'Linienstärke', min: 1, max: 4, step: 0.5, unit: 'px', value: 1 },
                    { name: '--gap', label: 'Standard Abstand', min: 0.25, max: 3, step: 0.05, unit: 'rem', value: 1 },
                ]
            },{
                label: 'Schatten',
                children: [
                    { name: '--shadow-x', label: 'Schatten X', min: -2, max: 2, step: 0.05, unit: 'rem', value: 0 },
                    { name: '--shadow-y', label: 'Schatten Y', min: -2, max: 2, step: 0.05, unit: 'rem', value: 0.25 },
                    { name: '--shadow-blur', label: 'Schatten Blur', min: 0, max: 4, step: 0.1, unit: 'rem', value: 1 },
                    { name: '--shadow-color', label: 'Schatten Farbe', type: 'color', value: '#00000099' }
                ]
            },{ 
                label: 'Form Controls',
                children: [
                    { name: '--control-padding-x', label: 'Padding X', min: 0.25, max: 2, step: 0.05, unit: 'em', value: 0.75 },
                    { name: '--control-padding-y', label: 'Padding Y', min: 0.125, max: 1.5, step: 0.05, unit: 'em', value: 0.375 },
                    { name: '--control-radius', label: 'Border Radius', min: 0, max: 2, step: 0.05, unit: 'rem', value: 0.3 },
                    { name: '--control-border-width', label: 'Border Width', min: 0, max: 3, step: 0.5, unit: 'px', value: 1 },
                ]
            }
        ];

        this.attachShadow({ mode: 'open' });
        this.render();
    }

    getStyleTarget() {
        const selector = this.getAttribute('target');
        return selector ? (document.querySelector(selector) || document.documentElement) : document.documentElement;
    }

    createControlHtml(v) {
        let content = '';
        if (v.type === 'color') {
            content = `
                <label for="${v.name}">${v.label}</label>
                <input type="color" id="${v.name}" name="${v.name}" value="${v.value}">
            `;
        } else if (v.type === 'checkbox') {
            content = `
                <label class="checkbox-label">
                    <input type="checkbox" id="${v.name}" name="${v.name}" ${v.value ? 'checked' : ''}>
                    ${v.label}
                </label>
            `;
        } else if (v.type === 'select') {
            content = `
                <label for="${v.name}">${v.label}</label>
                <select id="${v.name}" name="${v.name}">
                    ${v.options.map(opt => `<option value="${opt}" ${opt === v.value ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            `;
        } else {
            // Range Slider
            const valueId = v.name.replace('--', '') + '-value';
            content = `
                <label for="${v.name}">
                    ${v.label}
                    <span class="value-display" id="${valueId}">${v.value}${v.unit || ''}</span>
                </label>
                <input type="range" id="${v.name}" name="${v.name}" 
                    min="${v.min}" max="${v.max}" step="${v.step}" value="${v.value}"
                    data-unit="${v.unit || ''}">
            `;
        }
        return `
            <div class="control-group" data-var="${v.name}">
                <input type="checkbox" class="disable-toggle" data-for="${v.name}" checked title="Property aktivieren/deaktivieren">
                <div class="control-content">
                    ${content}
                </div>
            </div>`;
    }

    render() {
        const style = `
            :host {
                all: initial;
                font-family: system-ui, sans-serif;
                font-size: 12px;
                color: #222;
                display: block;
                max-width: 25em;
                min-width: 18em;
                position: fixed;
                top: 0.75em;
                right: 0.75em;
                background: #bbb;
                border: 1px solid #ddd;
                padding: .3em;
                border-radius: 0.5em;
                z-index: 9999;
                box-shadow: 0 0.25em 1em rgba(0,0,0,0.15);
                max-height: 90vh;
                overflow-y: auto;
            }
            .styler-grid { display: grid; gap: 0.3em; }
            .control-group { 
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 0.5em;
                align-items: start;
            }
            .control-group.disabled .control-content { 
                opacity: 0.4; 
                pointer-events: none; 
            }
            .disable-toggle {
                width: auto;
                margin-top: 0.2em;
            }
            .control-content {
                display: flex;
                flex-direction: column;
                gap: 0.3em;
            }
            label {
                font-size: 0.85em;
                font-weight: 600;
                display: flex;
                align-items: center;
                color: #333;
            }
            [inert] { opacity: .4; }
            .checkbox-label {
                flex-direction: row;
                gap: 0.5em;
                font-weight: normal;
            }
            .value-display {
                font-family: 'Courier New', monospace;
                font-size: 0.8em;
                color: #666;
                margin-left: auto;
                font-weight: normal;
            }
            
            input[type="range"] { width: 100%; margin: 0; }
            input[type="color"] {
                width: 100%;
                height: 2.5em;
                border: 1px solid #ccc;
                border-radius: 0.25em;
                cursor: pointer;
            }
            input[type="checkbox"] { width: auto; }
            select {
                width: 100%;
                padding: 0.4em;
                border: 1px solid #ccc;
                border-radius: 0.25em;
                font-size: 0.9em;
                background: white;
            }
            
            details {
                border-radius: 0.3em;
                background: #fff;
            }
            summary {
                padding: .5em;
                font-weight: 600;
                cursor: pointer;
                user-select: none;
                list-style: none;
                background:#eee;
                border-radius: .3em;
            }
            summary::marker, summary::-webkit-details-marker { display: none; }
            .details-content {
                padding: .5em;
                display: grid;
                gap: 0.6em;
            }
            [u2-movable-handler] { cursor: move; background: repeating-linear-gradient(45deg,transparent 0 3px,rgba(0,0,0,0.1) 3px 6px); height:.8rem; border-radius:.2rem; }
        `;

        // Gruppen vs einzelne Controls
        const renderItem = (v) => {
            if (v.children) {
                return `
                <details>
                    <summary>${v.label}</summary>
                    <div class="details-content">
                    ${v.children.map(c => renderItem(c)).join('')}
                    </div>
                </details>`;
            }
            return this.createControlHtml(v);
        };

        const controls = this.variables.map(v => renderItem(v)).join('');        

        import('../../attr/movable/movable.js');
        this.setAttribute('u2-movable', '');
        this.shadowRoot.innerHTML = `<style>${style}</style>
            <div class="styler-grid">
                <div u2-movable-handler></div>
                <details open>
                    <summary>Styler</summary>
                    <div class=details-content>
                        <label>
                            Darkmode <input type=checkbox onclick="document.documentElement.setAttribute('u2-skin', this.checked?'dark':'light')">
                        </label>
                    </div>
                </details>

                ${controls}
            </div>`;

        // Event Listener
        this.shadowRoot.querySelectorAll('input, select').forEach(input => {
            if (input.classList.contains('disable-toggle')) {
                input.addEventListener('change', () => this.handleDisableToggle(input));
            } else {
                input.addEventListener('input', () => this.handleInput(input));
                input.addEventListener('change', () => this.handleInput(input));
                this.setInitialValue(input);
            }
        });
    }

    setInitialValue(input) {
        const elValue = getComputedStyle(this.targetElement).getPropertyValue(input.name).trim();
        
        if (!elValue) return;

        if (input.type === 'range') {
            const {unit: elUnit, value: elNumber} = parseCssLength(elValue);
            const inpUnit = input.dataset.unit || '';
            const elPx = unitToPx(elNumber, elUnit, this.targetElement);
            input.value = pxToUnit(elPx, inpUnit, this.targetElement);
            
            const valueId = input.name.replace('--', '') + '-value';
            const display = this.shadowRoot.getElementById(valueId);
            if (display) display.textContent = elValue;
        } else if (input.type === 'color') {
            input.value = rgbToHex(elValue) || elValue;
        } else if (input.tagName === 'SELECT') {
            input.value = elValue;
        }
    }

    handleInput(input) {
        this.applyVariable(input.name, input.value, input.dataset.unit || '');
    }

    handleDisableToggle(checkbox) {
        const varName = checkbox.dataset.for;
        const controlGroup = this.shadowRoot.querySelector(`.control-group[data-var="${varName}"]`);
        
        if (checkbox.checked) {
            controlGroup.classList.remove('disabled');
            // Property mit aktuellem Wert setzen
            const mainInput = this.shadowRoot.querySelector(`[name="${varName}"]`);
            if (mainInput) {
                this.applyVariable(varName, mainInput.value, mainInput.dataset?.unit || '');
            }
        } else {
            controlGroup.classList.add('disabled');
            // Property entfernen (= default Wert)
            this.targetElement.style.removeProperty(varName);
        }
    }

    applyVariable(name, value, unit) {
        const fullValue = value + unit;

        if (name === '--font-1' || name === '--font-2') {
            loadFont(value);

            const google = FONTS[value].google;
            for (const variant of this.shadowRoot.querySelector(`[data-var="${name}"]`).parentNode.children) {
                if (!variant.dataset.var.startsWith(name + '-')) continue;
                const setting = variant.dataset.var.replace(name+'-', '');
                const ok = google?.includes(setting);
                variant.inert = !ok;
            }
            this.targetElement.style.setProperty(
                name,
                FONTS[value].stack
            );
            return;
        }

        this.targetElement.style.setProperty(name, fullValue);

        const valueId = name.replace('--', '') + '-value';
        const display = this.shadowRoot.getElementById(valueId);
        if (display) display.textContent = fullValue;
    }
}

customElements.define('u2-system-styler', ColorSystemStyler);



function loadFont(key) {
  const font = FONTS[key];
  if (!font?.google) return;

  const id = 'vf-' + key;
  if (document.getElementById(id)) return;  // schon geladen?

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=' + font.google + '&display=swap';
  document.head.appendChild(link);
}

// Helper Functions
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

function rgbToHex(rgb) {
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return null;
    const hex = (x) => ("0" + parseInt(x).toString(16)).slice(-2);
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}
