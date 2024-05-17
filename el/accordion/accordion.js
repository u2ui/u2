// See https://www.w3.org/TR/wai-aria-practices-1.1/#tabpanel

const icoCssUrl = import.meta.resolve('../../el/ico/ico.css');


customElements.define('u2-accordion', class extends HTMLElement {

    constructor() {
        super();

        import('../ico/ico.js');

        let shadowRoot = this.attachShadow({ mode: 'open', slotAssignment: 'manual' });
        shadowRoot.innerHTML = `
        <style>
        @import url('${icoCssUrl}');
        :host {
            display:block;
            --u2-ico-dir:'https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.11/svg/{icon_name}/baseline.svg';
        }
        :host(:active) {
            xoutline:none !important;
        }
        #accordion {
            display:flex;
            flex-direction:column;
            gap:0.5em;
        }
        .trigger {
            display:flex;
            align-items:baseline;
            cursor:pointer;
            padding-inline:1em;
            padding-block:.5em;
            background-color:#ddd;
            background-color:var(--color-light);
            & .icon {
                margin-inline-start:auto;
                display:flex;
                transition:0.2s;

                & > u2-ico {
                    --size:1em;
                }
                [aria-expanded="true"] > & {
                    transform:rotate(180deg);
                }
            }
        }
        .trigger:is(:focus,:active) {
            xoutline:2px solid blue;
            outline:--u2-focus-outline;
        }
        .title::slotted(*) {
            margin:0 !important;
            flex:1 1 auto;
            font-size:1em;
        }
        .content {
            display:block;
            padding:1em;
            background-color: #9999990a;

            overflow:auto;
            transition:.3s;
            transition-behavior: allow-discrete;
        }
        .content[hidden="until-found"] {
            content-visibility:visible;
            xopacity:0;
            overflow:hidden;
            block-size:0;
            max-block-size:0;
            padding-block:0;
        }
        </style>
        <div id=accordion role=presentation></div>
        `;
        this.items = this.shadowRoot.querySelector('#accordion').children;

        this._onClick = this._onClick.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);

        this.mutationObserver = new MutationObserver(() => this._build());
    }

    connectedCallback() {
        this._build();
        this.shadowRoot.addEventListener('click', this._onClick);
        this.shadowRoot.addEventListener('keydown', this._onKeyDown);
        this.mutationObserver.observe(this, { childList: true });
    }
    disconnectedCallback() {
        this.shadowRoot.removeEventListener('click', this._onClick);
        this.shadowRoot.removeEventListener('keydown', this._onKeyDown);
        this.mutationObserver.disconnect();
    }

    _build() {

        const container = this.shadowRoot.querySelector('#accordion');
        const icon = this.getAttribute('icon') || 'expand-more';

        let hLevel = 6;
        // get highest heading level
        for (let node of this.children) {
            if (!node.tagName.match(/^H[1-6]$/)) continue;
            let level = parseInt(node.tagName[1]);
            if (level < hLevel) hLevel = level;
        }



        let index = -1;
        let activeContent = null;
        let collectedContents = [];
        for (let node of this.childNodes) {
            if (node.tagName === 'H'+hLevel) {
                activeContent && activeContent.assign(...collectedContents);
                index++;
                let panel = container.childNodes[index];
                if (!panel) {
                    panel = document.createElement('div');
                    panel.innerHTML = `
                        <span class=trigger id=title${index}   role=button part=trigger tabindex=0  aria-controls=content${index} aria-expanded=false>
                            <slot class=title part=title></slot>
                            <slot class=icon part=icon>
                                <u2-ico icon=${icon}>▾</u2-ico>
                            </slot>
                        </span>
                        <slot class=content id=content${index} role=region part=content hidden=until-found aria-hidden=true aria-labelledby=title${index}></slot>
                    `;
                    container.appendChild(panel);
                }
                const title = panel.querySelector('.title');
                title.assign(node);
                activeContent = panel.querySelector('.content');
                collectedContents = [];
            } else {
                if (activeContent) collectedContents.push(node);
            }
        }
        activeContent && activeContent.assign(...collectedContents);
    }

    // get selected() {
    //     return this._selected;
    // }

    // set selected(index) {
    //     this._selected = index;
    //     this._selectTab(index);
    //     this.setAttribute('selected', index);
    // }
    // _selectTab(idx = null) { // todo? merge into `set selected()`?
    //     [...this.items].forEach((panel, i) => {
    //         let select = i === idx;
    //         let trigger = panel.querySelector('.trigger');
    //         //trigger.setAttribute('tabindex', select ? 0 : -1);
    //         trigger.setAttribute('aria-expanded', select);
    //         let content = panel.querySelector('.content');
    //         content.setAttribute('tabindex', select ? 0 : -1);
    //         if (select) {
    //             content.removeAttribute('hidden');
    //         } else {
    //             content.setAttribute('hidden', 'until-found');
    //         }
    //     });
    // }


    _getTargetTriggerFromEvent(event) {
        const path = event.composedPath();
        const rootIndex = path.indexOf(this.shadowRoot);
        if (rootIndex === -1) return;
        const target = path[rootIndex - 3];
        if (!target?.classList.contains('trigger')) return;
        return target;
    }

    _focusItem(index) {
        this.items[index]?.querySelector('.trigger').focus();
        if (this.getAttribute('single') !== null) {
            this._toggleItem(index, true);
        }
    }
    _toggleItem(index, expand){
        const panel = this.items[index];
        const trigger = panel.querySelector('.trigger');
        const content = panel.querySelector('.content');
        expand ??= trigger.getAttribute('aria-expanded') !== 'true';
        trigger.setAttribute('aria-expanded', expand);
        content.setAttribute('aria-hidden', !expand);
        if (expand) {
            content.removeAttribute('hidden');
            trigger.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
            if (this.getAttribute('single') !== null) {
                [...this.items].forEach((item, i) => { i !== index && this._toggleItem(i, false); });
            }
        } else {
            content.setAttribute('hidden', 'until-found');
        }
    }

    _onClick(e) {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const trigger = this._getTargetTriggerFromEvent(e);
        if (!trigger) return;
        const panel = trigger.parentElement;
        const index = [...panel.parentElement.children].indexOf(panel);
        // beta, should not be here but in "_selectTab"?
        // let event = new CustomEvent('u2-activate', { bubbles: true, cancelable: true });
        // target.dispatchEvent(event);
        // if (event.defaultPrevented) return;
        this._toggleItem(index);
        trigger.focus();
    }
    _onKeyDown(e) {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const trigger = this._getTargetTriggerFromEvent(e);
        if (!trigger) return;
        const panel = trigger.parentElement;
        const idx = [...panel.parentElement.children].indexOf(panel);

        const actions = {
            ArrowUp: (idx) => this._focusItem(idx - 1),
            ArrowDown: (idx) => this._focusItem(idx + 1),
            Home: () => this._focusItem(0),
            End: () => this._focusItem(this.items.length - 1),
            Enter: () => this._toggleItem(idx),
            Space: () => this._toggleItem(idx),
        };
        if (actions[e.code]) {
            e.preventDefault();
            actions[e.code](idx);
        }
    }

    // static observedAttributes = ['selected'];
    // attributeChangedCallback(name, oldValue, newValue) {
    //     if (oldValue === newValue) return;
    //     if (name === 'selected') this.selected = parseInt(newValue);
    // }

});


// // beta, does not work if initial u2-target is already fired
// // problem: sometimes, on initial load, the event is fired before the listener is added
// document.addEventListener('u2-target', e => {
//     let accordion = document.querySelectorAll('u2-accordion > :target');
//     for (let tab of accordion) tab.click();
// });

