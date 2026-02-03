
const icoCssUrl = import.meta.resolve('../../el/ico/ico.css');

class Accordion extends HTMLElement {

    constructor() {
        super();

        import('../ico/ico.js');

        let shadowRoot = this.attachShadow({ mode: 'open', slotAssignment: 'manual' });
        shadowRoot.innerHTML = `
        <style>
        @import url('${icoCssUrl}');
        :host {
            display:block;
            gap:.5em;
            --u2-ico-dir:var(--u2-ico-dir-material);
        }
        #items {
            display:flex;
            flex-direction:column;
            gap:inherit;
        }
        .trigger {
            display:flex;
            align-items:baseline;
            cursor:pointer;
            padding-inline:1em;
            padding-block:.5em;
            background-color:var(--color-light, #ddd);
        }
        .icon {
            margin-inline-start:auto;
            display:flex;
            transition:0.2s;
            --size:1em;
            & > u2-ico { --size:inherit; }
            [aria-expanded="true"] > & { transform:rotate(180deg); }
        }
        .title::slotted(*) {
            margin:0 !important;
            flex:1 1 auto;
            font-size: inherit !important;
        }
        .wrapper {
            display:grid;
            grid-template-rows: 1fr;
            transition: grid-template-rows .3s ease-in-out;
            min-block-size:0;
        }
        .wrapper[hidden="until-found"] {
            content-visibility:visible;
            grid-template-rows: 0fr;
        }
        .content {
            padding:1em;
            display:flow-root;
        }
        </style>
        <div id=items role=presentation></div>
        `;
        this.items = this.shadowRoot.querySelector('#items').children;
        this._onClick = this._onClick.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this.mutationObserver = new MutationObserver(() => this._build());

    }

    connectedCallback() {
        this._build();
        this.shadowRoot.addEventListener('click', this._onClick);
        this.shadowRoot.addEventListener('keydown', this._onKeyDown);
        this.mutationObserver.observe(this, { childList: true });
        // this.shadowRoot.addEventListener("beforematch", e => { // not working in firefox properly
        //     let item = e.target.closest('[part=item]');
        //     console.dir(e)
        //     if (!item) return;
        //     e.preventDefault();
        //     this._toggleItem([...item.parentElement.children].indexOf(item));
        // });
    }

    disconnectedCallback() {
        this.shadowRoot.removeEventListener('click', this._onClick);
        this.shadowRoot.removeEventListener('keydown', this._onKeyDown);
        this.mutationObserver.disconnect();
    }

    _build() {
        const container = this.shadowRoot.querySelector('#items');
        const icon = this.getAttribute('icon') || 'expand-more';

        let hLevel = 6;
        for (let node of this.children) { // get highest heading level
            if (!node.tagName.match(/^H[1-6]$/)) continue;
            let level = parseInt(node.tagName[1]);
            if (level < hLevel) hLevel = level;
        }

        let index = -1;
        let activeContent = null;
        let collectedContents = [];
        for (let node of this.childNodes) {
            if (node.tagName === 'H' + hLevel) {
                activeContent && activeContent.assign(...collectedContents);
                index++;
                let item = container.childNodes[index];
                if (!item) {
                    item = document.createElement('div');
                    item.part = 'item';
                    item.innerHTML = `
                        <span class=trigger id=title${index} role=button part=trigger tabindex=0 aria-controls=content${index} aria-expanded=false>
                            <slot class=title part=title></slot>
                            <slot class=icon part=icon>
                                <u2-ico icon=${icon}>▾</u2-ico>
                            </slot>
                        </span>
                        <div class=wrapper part=wrapper id=content${index} role=region hidden=until-found aria-hidden=true aria-labelledby=title${index}>
                            <div style="overflow:hidden">
                                <slot class=content part=content></slot>
                            </div>
                        </div>
                    `;
                    // chrome needs this extra <div style="overflow:hidden">
                    container.appendChild(item);
                }
                const title = item.querySelector('.title');
                title.assign(node);
                item.querySelector('.trigger').addEventListener("mousedown", e => {
                    if (e.detail === 2) e.preventDefault(); // Doppelklick
                });
                activeContent = item.querySelector('.content');
                collectedContents = [];
            } else {
                if (activeContent) collectedContents.push(node);
            }
        }
        while (container.children.length > index + 1) container.lastChild.remove(); // remove excess items
        activeContent && activeContent.assign(...collectedContents);
    }

    _getTargetTriggerFromEvent(event) {
        const path = event.composedPath();
        const rootIndex = path.indexOf(this.shadowRoot);
        if (rootIndex === -1) return;
        const target = path[rootIndex - 3];
        if (!target?.classList.contains('trigger')) return;
        return target;
    }

    _focusItem(index) {
        const item = this.items[index];
        if (!item) return;
        item.querySelector('.trigger').focus();
        this.hasAttribute('single') && this._toggleItem(index, true);
    }
    _toggleItem(index, expand) {
        const item = this.items[index];
        const trigger = item.querySelector('.trigger');
        const wrapper = item.querySelector('.wrapper');
        expand ??= trigger.ariaExpanded !== 'true';
        trigger.ariaExpanded = expand;
        wrapper.ariaHidden = !expand;
        wrapper.hidden = expand ? false : 'until-found';
        if (expand) {
            trigger.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
            if (this.hasAttribute('single')) {
                [...this.items].forEach((item, i) => { i !== index && this._toggleItem(i, false); });
            }
        }
    }

    _onClick(e) {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const trigger = this._getTargetTriggerFromEvent(e);
        if (!trigger) return;
        const item = trigger.parentElement;
        const index = [...item.parentElement.children].indexOf(item);
        this._toggleItem(index);
        if (e.target.form !== undefined || e.target.isContentEditable) return;
        trigger.focus();
    }
    _onKeyDown(e) {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.target.form !== undefined || e.target.isContentEditable) return;
        const trigger = this._getTargetTriggerFromEvent(e);
        if (!trigger) return;
        const item = trigger.parentElement;
        const idx = [...item.parentElement.children].indexOf(item);

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
}

customElements.define('u2-accordion', Accordion);
