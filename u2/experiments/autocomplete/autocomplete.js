import '../../../u2/u2.js';
import { U2Menu } from './U2Menu.js';
import { Placer } from '../../../js/Placer/Placer.js';

const DEBOUNCE = 150;

class U2Autocomplete extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' }).innerHTML = `
        <style>
            :host { display: inline-block; }
            [role=listbox] {
                position:absolute;
                margin: 0;
                padding: 0;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                border: 0;
                max-height: 20rem;
                overflow-y: auto;
                overscroll-behavior: contain;
                [part~="active"] { background: var(--color-light); }
                [part~="selected"] { background: var(--color); color: var(--color-bg); }
                [role="option"] { padding: .4rem; cursor: pointer; }
            }
        </style>
        <slot></slot>
        `;
    }

    connectedCallback() {
        const input = this.querySelector('input');
        if (!input) throw new Error('u2-autocomplete requires an input element');
        this.input = input;

        this.template = this.querySelector('template')?.innerHTML.trim() || '<div>{{label}}</div>';
        
        // Key-Konfiguration
        this.valueKey = this.getAttribute('value-key') || 'id';
        this.labelKey = this.getAttribute('label-key') || 'name';


        // Defaults mit Keys normalisieren
        const datalist = this.querySelector('datalist');
        this.defaults = datalist 
            ? [...datalist.querySelectorAll('option')].map(o => 
                this._normalizeItem({ id: o.value, name: o.textContent.trim() })
              )
            : [];

        this.menu = new U2Menu('listbox');
        this.menu.element.popover = 'manual';
        this.menu.element.addEventListener('u2Menu-select', e => this._selectOption(this.currentItems[e.detail.index]));
        this.menu.element.addEventListener('u2Menu-active', e => this.input.ariaActiveDescendantElement = e.target); // Does this work cross-shadow-dom?
        this.menu.element.tabIndex = -1;

        input.role = 'combobox';
        input.ariaAutoComplete = 'list';
        input.ariaControls = this.menu.element.id;
        input.ariaExpanded = false;

        this.shadowRoot.appendChild(this.menu.element);

        input.addEventListener('input', e => this._handleInput(e));
        input.addEventListener('focus', e => this._handleInput(e));
        input.addEventListener('keydown', e => this._handleKeydown(e));
        this.addEventListener('focusout', e => !this.contains(e.relatedTarget) && this.hideMenu());
    }

    // Normalisiert Item mit value/text basierend auf Keys
    _normalizeItem(item) {
        const value = getValue(item, this.valueKey);
        const label = getValue(item, this.labelKey);
        return { ...item, value, label };
    }

    _handleKeydown(e) {
        const actions = {
            'ArrowDown': () => { this.showMenu(); this.menu.navigate('next'); },
            'ArrowUp': () => this.menu.navigate('prev'),
            'Home': () => this.menu.navigate('first'),
            'End': () => this.menu.navigate('last'),
            'Enter': () => this.menu.select(),
            'Escape': () => this.hideMenu()
        };
        if (actions[e.key]) {
            e.preventDefault();
            actions[e.key]();
        }
    }

    _handleInput(e) {
        if (!e.isTrusted) return; // Ignore self-triggered input
        const val = e.target.value.trim();
        clearTimeout(this._timeout);
        const minLength = parseInt(this.getAttribute('min-length')) || 0;
        if (val.length < minLength) {
            this.menu.element.matches(':popover-open') && this.hideMenu();
            return;
        }
        this._timeout = setTimeout(() => this._fetch(val), DEBOUNCE);
    }

    async _fetch(query) {
        if (!this.hasAttribute('src')) return this._render(this.defaults);

        const src = this.getAttribute('src').replace('{query}', encodeURIComponent(query));

        // const loading = await u2.js('loading');
        // const done = loading.mark(this.input);
        try {
            const url = new URL(src, location.origin);
            
            const res = await fetch(url);
            const data = await res.json();

            // Items normalisieren
            const items = (Array.isArray(data) ? data : data.results || [])
                .map(item => this._normalizeItem(item));
            
            this._render(items);
        } catch (e) {
            console.error('u2-autocomplete fetch error:', e);
            this._render(this.defaults);
        }
        // done();
        this.menu.navigate('first');
    }

    _render(items) {
        // nur wenn der focus noch im input ist
        if (document.activeElement !== this.input) return;

        this.currentItems = items;
        this.menu.clear();

        items.forEach((item, index) => {
            const el = document.createElement('div');
            const html = renderTemplate(this.template, item, index);
            el.setHTMLUnsafe?.(html) ?? (el.innerHTML = html);
            this.menu.addItem(el);
        });        

        this.showMenu();
    }

    _selectOption(item) {
        this.input.value = item.value || '';
        this.hideMenu();
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async _place() {
        this.menu.element.style.minWidth = this.offsetWidth + 'px';
        new Placer(this.menu.element, { x: 'prepend', y: 'after', margin: 0 }).toElement(this);
    }

    showMenu() {
        this.menu.element.showPopover();
        this._place();
        this.input.ariaExpanded = true;
    }

    hideMenu() {
        this.menu.element.hidePopover();
        this.input.ariaExpanded = false;
    }

    disconnectedCallback() {
        clearTimeout(this._timeout);
    }
}

customElements.define('u2-autocomplete', U2Autocomplete);


function getValue(obj, path){
    return path.split('.').reduce((val, key) => val?.[key], obj);
}

function renderTemplate(template, data, index = 0) {
    return template
        .replace(/\{\{@index\}\}/g, index)
        .replace(/\{\{@value\}\}/g, data.value ?? '')
        .replace(/\{\{@label\}\}/g, data.label ?? '')
        .replace(/\{\{([^}|]+)(?:\|\|([^}]+))?\}\}/g, (_, path, fallback) => {
            const value = getValue(data, path.trim());
            return value ?? (fallback?.trim() || '');
        });
}
