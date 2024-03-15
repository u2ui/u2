let openTimeout;

class Menu {
    constructor(menuItem) {
        this.menuItem = menuItem;
        this.el = document.createElement('menu');
        this.el.role = 'menu';
        this.el.part = 'menu';
        this.children = [];
    }
    addItem(label, opt={}) {
        const item = new MenuItem(this, label, opt);
        this.el.append(item.el);
        this.children.push(item);
        return item;
    }
    addSeparator() {
        const li = document.createElement('li');
        li.role = 'separator';
        this.el.append(li);
    }
    add(items) {
        if (Array.isArray(items)) {
            for (const opt of items) {
                if (opt === '-') { this.addSeparator(); continue; }
                const item = this.addItem(opt.label, opt);
                if (opt.children) item.add(opt.children);
            }
        } else {
            for (const [label, opt] of Object.entries(items)) {
                if (typeof opt === 'function') {
                    this.addItem(label, {action:opt});
                } else {
                    const item = this.addItem(label);
                    item.add(opt);
                }
            }
        }
    }
    parseFor(element) { // returns number of active items for the element
        this.currentActive = this.children.filter(item=>item.parseFor(element)).length;
        return this.currentActive;
    }
    open() {
        clearTimeout(openTimeout);
        if (!this.currentActive) return;
        this.menuItem?.parentMenu?.children.forEach(m=>m._subMenu?.close());
        this.menuItem?.el.setAttribute('aria-expanded', true);
        this._placer().then(p =>{
            this.el.classList.add('-open');
            p.followElement(this.el.parentElement);
        });
    }
    openDelayed() {
        clearTimeout(openTimeout);
        openTimeout = setTimeout(()=>this.open(), 500);
    }
    close() {
        this.el.classList.remove('-open');
        this.menuItem?.el.removeAttribute('aria-expanded');
        this.children.forEach(m=>m._subMenu?.close());
    }
    async _placer() {
        if (!this.__placer) {
            const Placer = (await import('../Placer.js/Placer.js')).Placer;
            this.__placer = new Placer(this.el, {x:'after', y:'prepend'});
        }
        return this.__placer;
    }
}

class MenuItem {
    constructor(parentMenu, label, options){
        this.parentMenu = parentMenu;
        this.options = options;
        const li = this.el = document.createElement('li');
        li.role = 'presentation'; // todo: buttons should be role=menuitem?
        li.part = 'item';

        if (options.html) {
            li.innerHTML = options.html;
        } else {
            const btn = document.createElement('button');
            btn.role = 'menuitem';
            btn.classList.add('-item');   
            li.append(btn);
            btn.innerHTML = `
                <span class=-icon aria-hidden=true>${options.icon??''}</span>
                <span class=-label>${label}</span>
                <span class=-shortcut>${options.shortcut??''}</span>
                <span class=-arrow></span>`;
            btn.addEventListener('click', event=>{
                if (options.action) {
                    const e = {target:this.currentTarget, originalEvent:event};
                    options.action(e);
                    if (e.preventHide) return;
                }
                rootEl.hidePopover();
            });
            btn.addEventListener('mouseenter', e => this._subMenu?.openDelayed() );
            btn.addEventListener('focusin', e => this._subMenu?.openDelayed() );
        }

        if (options.shortcut) {
            import('../shortcut.js/shortcut.js').then(({listen})=>{
                listen(options.shortcut, event=>{
                    const target = options.selector ? !event.target.closest(options.selector) : false;
                    if (target) return; // ok?
                    this.currentTarget = target ?? document.documentElement;
                    event.preventDefault();
                    options.action({target:this.currentTarget, originalEvent:event});
                });
            });
        }

        li.addEventListener('mousedown',  stopPropagation)
        li.addEventListener('touchstart', stopPropagation)
    }
    subMenu() {
        if (!this._subMenu) {
            this._subMenu = new Menu(this);
            this.el.append(this._subMenu.el);
            this.options.action = e=> {
                this._subMenu.open();
                e.preventHide = true;
            }
        }
        return this._subMenu;
    }
    addItem(label, opt={}) {
        opt.selector ??= this.options?.selector;
        return this.subMenu().addItem(label, opt);
    }
    add(items) { this.subMenu().add(items); }
    addSeparator() { this.subMenu().addSeparator(); }
    parseFor(element) {
        this.currentActive = this._subMenu?.parseFor(element);
        this.currentTarget = this.options.selector ? element.closest(this.options.selector) : document.documentElement;

        if (this.currentActive) {
            this.el.querySelector(':scope > button > .-arrow').innerHTML = arrow;
        }
        if (this.currentActive || this.currentTarget) {
            this.el.hidden = false;
            this.options?.onparse?.bind(this)({target:this.currentTarget});
            return true;
        }
        this.el.hidden = true;
    }
}

const arrow = '<svg aria-hidden="true" style="display:block; height:1em" xmlns="http://www.w3.org/2000/svg" width="16" height="26" viewBox="0 0 16 26"><path d="m2 1 12 12L2 25" style="fill:none;stroke:currentColor;stroke-linecap:round;stroke-width:2"/></svg>';

const css = `
#u2ContextMenu { 
    --bg: var(--color-bg, Canvas);
    --text: var(--color-text, CanvasText);
    --line: color-mix(in oklab, var(--text) 20%, var(--bg));

    &, & menu {
        position:fixed; 
        top:0; 
        box-shadow:0 0 .8em rgba(0,0,0,.08); 
        list-style:none; 
        font-family:Arial; 
        font-size:14px; 
        margin:0; 
        padding:0; 
        min-width:10em; 
        cursor:default; 
        border: 1px solid var(--line);
        background-color: var(--bg, Canvas); 
        color: var(--text, CanvasText); 
    }
    & menu {
        display:none;
    }
    & menu.-open {
        display:block;
    }
    & menu:focus-within {
        display:block;
    }
    & li {
        display:flex;
        padding:0;
    }
    & li[hidden] {
        display:none !important;
    }
    & li:focus-within {
        background-color: color-mix(in oklab, var(--bg) 95%, var(--text));
    }
    & li[role=separator] {
        margin:.5em 0; 
        border-top:1px solid var(--line);
    }
    & .-item {
        display:flex;
        align-items:center;
        gap:.5em;
        flex:1 1 auto;
        border:0;
        border-radius:0;
        padding:.5em;
        text-align:left;
        background:transparent;
        color:inherit;
    }
    & .-icon {
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:1.715em; /* optimal: 24px */
        height:1em;
        min-width:1em;
        flex:0 0 auto;

        font-family: 'Material Symbols Rounded';
        font-weight: normal;
        font-style: normal;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        -moz-font-feature-settings: 'liga';
        -moz-osx-font-smoothing: grayscale;

        & svg {
            max-height:100%;
            fill:currentColor;
            display: block;
        }
    }
    & .-label {
        flex:1 1 auto;
        white-space:nowrap;
        max-width:19em;
        overflow:hidden;
        text-overflow:ellipsis;
    }
    & .-shortcut {
        flex:0 1 auto;
        text-align:right;
        font-size:.8em;
        white-space:nowrap;
        opacity:.5;
    }
}
`;

export const contextMenu = new Menu();
const rootEl = contextMenu.el;

rootEl.id = 'u2ContextMenu';
rootEl.popover = 'auto';

// todo: key navigation
function focusNext(direction){
    const root = menuContainer.shadowRoot || document;
    const activeLi = root.activeElement.closest('li');
    let next = activeLi;
    while (next) {
        if (direction==='next') next = next?.nextElementSibling;
        if (direction==='prev') next = next?.previousElementSibling;
        if (direction==='parent') next = next?.parentElement?.parentElement;
        if (direction==='child') next = next?.querySelector('li');
        if (!next) return;
        if (next.hidden) continue;
        const firstFocusable = next.querySelector(':scope :is(button, [tabindex], a, input, select, textarea)');
        if (firstFocusable) {
            firstFocusable.focus();
            break;
        }
    }
}
const onkey = {
    ArrowUp: ()=>focusNext('prev'),
    ArrowDown: ()=>focusNext('next'),
    ArrowLeft: ()=>focusNext('parent'),
    ArrowRight: ()=>focusNext('child'),
}
rootEl.addEventListener('keydown',e=>{
    if (!onkey[e.key]) return;
    onkey[e.key]?.(e);
    e.preventDefault();
});

rootEl.addEventListener('mouseenter', e => e.target.focus(),true);
rootEl.addEventListener('toggle', e => {
    if (e.newState === 'closed') contextMenu.close(); // close all submenus
});



const menuContainer = document.createElement('div');
const shadowRoot = menuContainer.attachShadow({mode: 'open'});

menuContainer.id = 'u2ContextMenuContainer';
menuContainer.innerHTML = `<link rel=stylesheet href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,200,0,0"/>`; // does not work in shadowdom

shadowRoot.innerHTML = `
<style>
@import "../../norm.css/norm.css";
@import "../../../css/base/base.css";
${css}
</style>`;

menuContainer.style.display = 'contents';
document.documentElement.appendChild(menuContainer);
shadowRoot.appendChild(rootEl);


document.documentElement.addEventListener('contextmenu', e=>{
    if (e.shiftKey) return;
    if (e.target === menuContainer) return;
    const has = contextMenu.parseFor(e.target);
    if (!has) return;
    e.preventDefault();
    
    rootEl.showPopover();
    rootEl.querySelector('button').focus();

    let top  = e.clientY + 2;
    let left = e.clientX + 2;
    top  = Math.min(innerHeight - rootEl.offsetHeight, top);
    left = Math.min(innerWidth  - rootEl.offsetWidth, left);
    rootEl.style.top  = top+'px';
    rootEl.style.left = left+'px';
});


/* helpers */
function stopPropagation(e) { e.stopPropagation() }
