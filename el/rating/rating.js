const icoCssUrl = import.meta.resolve('../../el/ico/ico.css');

const style = `
@import url('${icoCssUrl}');
:host {
    --u2-ico-dir:'https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.11/svg/{icon}/baseline.svg';
    --color-inactive:#ccc;
    --color-active:#ea1;
    display:inline-block;
}
#stars {
    display:flex;
    & > * { color:var(--color-inactive); transition:.2s; cursor:pointer; transform-origin:50% 50%; display:block; --size:1.2em; }
    & > .active { color:var(--color-active); }
    & > .preview { color:var(--color-active); }
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
    }
    #stars() {
        return [...this.starsEl.children];
    }
    connectedCallback() {
        const max = this.getAttribute('max') ?? 5;
        const icon = this.getAttribute('icon') ?? 'star';

        //this.starsEl.setAttribute('aria-valuemax', max);
        this.setAttribute('tabindex', '0');

        for (let i = 0; i < max; i++) {
            this.starsEl.innerHTML += `<u2-ico icon=${icon}></u2-ico>`;
        }

        this.starsEl.addEventListener('mouseenter', (event)=>{
            const target = event.target;
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
        this.shadowRoot.addEventListener('click', (event)=>{
            const target = event.target.closest('#stars > *');
            if (!target) return;
            this.value = this.#stars().indexOf(target) + 1;
        });
        this._internals.ariaLabel = translate('Rating');
        this._internals.ariaMin = 1;
        this._internals.ariaMax = max;

        this.value = this.getAttribute('value');
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
        this.#value = value;
        this._internals.setFormValue(value);

        if (this.hasAttribute('required') && !value) {
            this._internals.setValidity({valueMissing: true}, translate('Please select a rating'));
        } else {
            this._internals.setValidity({});
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
