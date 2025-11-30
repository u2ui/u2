let css = `
:host { display:block; }
:host([role=tree]) { --indent:1rem; }
:host(:not([aria-expanded=true])) [part=children] { display:none; }
:host([aria-expanded=true]) .arrow::after { content:'▾' }
:host(:not([aria-expanded])) .arrow { opacity:0; }
:host([aria-expanded=true][aria-busy=true]) .arrow::after {
    content:'◠'; /* ◝↻⭮⍉🔾◠◡◕◖◝ */
    font-weight:bold;
    animation: spinner .5s linear infinite;
    line-height:1;
    font-size:.8em;
}
[part=row] {
    display:flex;
    align-items:baseline;
    padding-block: .15em;
    padding-inline-start:calc( var(--indent) * (var(--level) - 1) );
    gap:.3em;
}
.arrow {
    font-weight:normal !important;
    min-width:1.1em;
    text-align:center;
}
.arrow::after { content:'▸'; display:inline-block; }
@keyframes spinner { to { transform:rotate(360deg) } }
[name=icon] {
    display:flex;
    align-items: center;
    justify-content:center;
    min-inline-size:1.7em;
    font-weight:400;
    align-self:stretch;
}
`;
const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css);


export class tree extends HTMLElement {

    constructor() {
        super();
        const shadow = this.attachShadow({mode: 'open', delegatesFocus: true});
        shadow.adoptedStyleSheets = [styleSheet];
        shadow.innerHTML = `
        <div part=row tabindex=-1>
            <span class=arrow></span>
            <slot name=icon part=icon>📁</slot>
            <slot part=content></slot>
        </div>
        <slot part=children name=children role=group></slot>`

        this.row = shadow.querySelector('[part=row]');

        this.addEventListener('click',e=>{
            if (e.target !== this) return;
            if (!getSelection()?.isCollapsed) return;
            this.toggleExpand();
            this.activeElement = this;
            this._select();
        });
        this.addEventListener('keydown',e=>{
            if (e.target !== this) return;
            let fn = {
                ArrowUp:    ()=> this.prevFocusable()?.setFocus?.(),
                ArrowDown:  ()=> this.nextFocusable()?.setFocus(),
                ArrowRight: ()=> !this.isExpanded() ? this.toggleExpand(true) : this.nextFocusable()?.setFocus(),
                ArrowLeft:  ()=> this.isExpanded() ? this.toggleExpand(false) : this.parentNode.setFocus?.(),
                Enter:      ()=> {this._select(); this.toggleExpand(); }, // todo toggle?
                ' ':        ()=> this._select(),
                Home:       ()=> this.root().setFocus(),
            }[e.key];
            // focus next where text starts with the key pressed
            const isChar = /^.$/u.test(e.key);
            if (isChar) {
                let current = this.nextFocusable() || this.root();
                while (current && current !== this) {
                    let text = current.shadowRoot.querySelector('[part=content]').assignedNodes().map(item=>item.textContent).join(' ').trim().toLowerCase();
                    if (text.startsWith(e.key)) {
                        current.setFocus();
                        break;
                    }
                    current = current.nextFocusable() || this.root();
                }
            }
            if (fn) { fn(); e.preventDefault(); }
        });

        this.addEventListener('mousedown', e => e.detail >= 2 && e.preventDefault() );  // prevent dbl-click selection

        this.childrenObserver = new MutationObserver(mutations => this._markup())

    }
    connectedCallback() {
        this.childrenObserver.observe(this, {childList: true});
        this._markup();
    }
    disconnectedCallback() {
        this.childrenObserver.disconnect();
    }
    _markup(){
        // own level
        const root = this.root();
        const myLevel = root === this ? 1 : parseInt(this.parentNode.getAttribute('aria-level')) + 1;
        this.ariaLevel = myLevel; // todo: internals?
        this.style.setProperty('--level', myLevel);

        // slot subnodes
        for (const child of this.children) {
            child.tagName === this.tagName && child.setAttribute('slot', 'children');
        }
        this.role = root === this ? 'tree' : 'treeitem';

        // make it selectable if its the root and no other is selected
        if (root === this && !root._activeElement) this.row.tabIndex = 0;

        // if (this.getAttribute('icon')) {
        //     this.shadowRoot.querySelector('[part=icon]').innerHTML = '<u2-ico inline icon="' + this.getAttribute('icon') + '"></u2-ico>';
        // }

        // if has children, its expandable
        if (!this.hasAttribute('aria-expanded')) {
            if (this.items().length) this.setAttribute('aria-expanded', 'false');
            else this.removeAttribute('aria-expanded');
        }
    }
    items(){
        return this.shadowRoot.querySelector('[part=children]').assignedElements();
    }
    nextFocusable(){
        let item = this;
        while (item) {
            let next = null;
            if (item.isExpanded()) next = item.items().at(0);
            if (!next) next = item.nextElementSibling; // todo: only next treeitem
            if (!next) {
                while (item.parentNode) {
                    item = item.parentNode;
                    if (item.nextElementSibling) {
                        next = item.nextElementSibling;
                        break;
                    }
                }
            }

            if (next.tagName !== this.tagName) return null;
            if (next) return next;
            item = next;
        }
    }
    prevFocusable(){
        let item = this;
        while (item) {
            let next = item.previousElementSibling; // todo: only next treeitem
            if (next) {
                if (next.isExpanded()) {
                    next = next.items().at(-1);
                }
            }
            if (!next) next = item.parentNode;
            if (next) return next;
            item = next;
        }
    }
    isExpanded() {
        return this.ariaExpanded === 'true';
    }
    isExpandable() {
        const attr = this.ariaExpanded;
        return attr === 'true' || attr === 'false' || this.items().length;
    }
    toggleExpand(doit) {
        if (!this.isExpandable()) return;
        doit ??= !this.isExpanded();

        const event = new CustomEvent(doit?'u2-tree1-expand':'u2-tree1-collapse', {bubbles: true});

        if (this.ariaLive && this.ariaBusy !== 'true') {

            event.load = callback=>{
                const promise = callback(this);
                this.ariaBusy = true;
                promise.then(data => {
                    this.ariaLive = null;
                    this.ariaBusy = null;
                    setTimeout(()=>{ // make unexpandable if no children
                        !this.items().length && this.removeAttribute('aria-expanded');
                    },100);
                }).catch(data=>{
                    console.warn('todo: u2-tree: failed to load', data);
                });
            }

        }
        this.dispatchEvent(event);
        this.ariaExpanded = doit?'true':'false';
    }

    select(){
        let old = this.root()._selected;
        if (old) old.ariaSelected = false;
        this.ariaSelected = true;
        this.root()._selected = this;
    }
    _select(){ // like selected but also fires event
        const event = new CustomEvent('u2-tree1-select', {bubbles: true});
        this.dispatchEvent(event);
        this.select();
    }

    get activeElement(){
        return this.root()._activeElement;
    }
    set activeElement(el){
        const old = this.root()._activeElement;
        if (old) old.row.tabIndex = -1;
        el.row.tabIndex = 0;
        el.row.focus();
        this.root()._activeElement = el;
    }
    setFocus() {
        this.activeElement = this;
    }
    root(){
        return this.isRoot() ? this : this.parentNode.root();
    }
    isRoot(){
        return this.parentNode?.tagName !== this.tagName;
    }
    path(){
        if (this.isRoot()) return [this];
        return this.parentNode.path().concat(this);
    }
}

customElements.define('u2-tree1', tree);
