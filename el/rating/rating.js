const icoCssUrl = import.meta.resolve('../../el/ico/ico.css');

const style = `
@import url('${icoCssUrl}');
:host {
    --u2-ico-dir: var(--u2-ico-dir-material);
    --color-inactive:#ccc;
    display:inline-block;
}
#stars {
    display:flex;
    & > * { color:var(--color-inactive); transition:.2s; cursor:pointer; transform-origin:50% 50%; display:block; --size:1.2em; }
    & > .active { color:inherit; }
    & > .preview { color:inherit; }
    & > :is(:hover,:focus) { transform:scale(1.2); outline:none; }
}
`;

class rating extends HTMLElement {
    static formAssociated = true;
    #value = null;
    constructor() {
        super();

        import('../ico/ico.js');

        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <style>${style}</style>
            <div id=stars></div>
            <slot></slot>
        `;
        this.starsEl = this.shadowRoot.getElementById('stars');
        this._internals = this.attachInternals();
        this._internals.role = 'slider';        

        this.starsEl.addEventListener('mouseenter', ({target})=>{
            if (!target.matches('#stars > *')) return;
            const stars = this.#stars();
            const value = stars.indexOf(target) + 1;
            stars.forEach((star, i)=>{
                star.classList.toggle('preview', i < value);
                star.classList.remove('active');
            });
        },true);
        this.starsEl.addEventListener('mouseleave', ()=>{
            this.#stars().forEach((star, i)=>{
                star.classList.remove('preview');
                star.classList.toggle('active', i < this.value);
            });
        });
        this.shadowRoot.addEventListener('click', ({target})=>{
            const item = target.closest('#stars > *');
            if (!item) return;
            this.value = this.#stars().indexOf(item) + 1;
        });
        this.addEventListener('keydown', (e)=>{
            const value = {
                ArrowRight: () => Math.min(this.value + 1, this.#stars().length),
                ArrowLeft: () => Math.max(this.value - 1, 1),
            }[e.key]?.();
            this.#stars().forEach(star => star.classList.remove('preview'));
            if (value!=null) this.value = value;
        });

    }
    #stars() {
        return [...this.starsEl.children];
    }
    connectedCallback() {
        this.render();
        this.setAttribute('tabindex', '0');
        this.value = this.getAttribute('value');
    }
    render(){
        const max = parseFloat(this.getAttribute('max')) || 5;
        const icon = this.getAttribute('icon') ?? 'star';

        this.starsEl.innerHTML = '';
        for (let i = 0; i < max; i++) {
            this.starsEl.innerHTML += `<u2-ico icon=${icon}></u2-ico>`;
        }

        this._internals.ariaLabel = translate('Rating');
        this._internals.ariaMin = 1;
        this._internals.ariaMax = max;        
    }
    get value() {
        return this.#value;
    }
    set value(value) {
        this.#stars().forEach((star, i)=>{
            star.classList.toggle('active', i < value);
        });
        //this.starsEl.setAttribute('aria-valuenow', value);
        this._internals.ariaValueNow = value;
        this.#value = parseFloat(value);
        this._internals.setFormValue(value);

        if (this.hasAttribute('required') && !value) {
            this._internals.setValidity({valueMissing: true}, translate('Please select a rating'));
        } else {
            this._internals.setValidity({});
        }
    }
    get form() { return this._internals.form; }
    static observedAttributes = ['value', 'icon', 'max','value'];
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'value') {
            this.value = newValue;
        } else {
            this.render();
        }
    }
}

const texts = {
    'Rating': {        
        'en': 'Rating',
        'es': 'Valoración',
        'fr': 'Évaluation',
        'de': 'Bewertung',
        'it': 'Valutazione',
    },
    'Please select a rating': {
        'en': 'Please select a rating',
        'es': 'Por favor selecciona una valoración',
        'fr': 'Veuillez sélectionner une évaluation',
        'de': 'Bitte wählen Sie eine Bewertung aus',
        'it': 'Seleziona una valutazione',
    },
}

function translate(text) {
    const lang = navigator.language.substring(0,2) || 'en';
    return texts[text][lang] ?? texts[text].en;
}

customElements.define('u2-rating', rating);
