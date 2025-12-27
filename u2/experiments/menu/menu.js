// sehr generische Lösung für container / items

const menus = new WeakMap();
const items = new WeakMap();

export function getMenu(menuEl){
    return menus.get(menuEl) ?? menus.set(menuEl, new Menu(menuEl)).get(menuEl);
}
export function getItem(itemEl){
    return items.get(itemEl) ?? items.set(itemEl, new MenuItem(itemEl)).get(itemEl);
}

class Menu {
    static acceptParent = 'li';
    static queryItems = ':scope > li';

    constructor(menuEl) {
        this.el = menuEl;
    }
    get parentItem() {
        return this.el.parentElement.matches(Menu.acceptParent) ? getItem(this.el.parentElement) : null;
    }
    get items() {
        return [...this.el.querySelectorAll(Menu.queryItems)].map(el=>getItem(el));
    }
    open() {
        this.parentItem?.el.setAttribute('aria-expanded', true);
    }
    close() {
        this.parentItem?.el.removeAttribute('aria-expanded');
        //this.children.forEach(m=>m._subMenu?.close());
    }
}

class MenuItem {
    static acceptParentMenu = 'menu,ul';
    static querySubMenu = ':scope > :is(menu,ul)';

    constructor(li){
        this.el = li;
    }
    get subMenu() {
        const el = this.el.querySelector(MenuItem.querySubMenu);
        return el ? getMenu(el) : null;
    }
    get menu() {
        return this.el.parentElement.matches(MenuItem.acceptParentMenu) ? getMenu(this.el.parentElement) : null;
    }
    get next() {
        return this.menu.items[this.menu.items.indexOf(this)+1];
    }
    get prev() {
        return this.menu.items[this.menu.items.indexOf(this)-1];
    }
    expand(){
        if (this.el.ariaExpanded === true) return;
        //this.menu.children.forEach(m=>m._subMenu?.close()); // close others?
        this.subMenu?.open(); 
    }
    collapse(){
        this.subMenu?.close();
    }
    firstFocusable() {
        return findFirstFocusable(this.el, this.subMenu?.el);
    }
}





function findFirstFocusable(root, exclude) {
    for (const child of root.children) {
        if (child === exclude) continue;
        if (isFocusable(child)) return child;        
        const found = findFirstFocusable(child, exclude);
        if (found) return found;
    }
}
function isFocusable(el) {
    if (el.disabled || el.inert) return false;
    
    if (el.getAttribute('tabindex') === '-1') return false;

    if (!el.matches(
        'button, [tabindex], a[href], ' +
        'input:not([type="hidden"]), select, textarea, ' +
        'details, [contenteditable], audio[controls], video[controls]'
    )) return false;
    
    if (el.closest('[inert]')) return false;
    
    // if (el.offsetParent === null) {
    //     if (getComputedStyle(el).position !== 'fixed') return false;
    // }
    
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden'; // position:fixed? position:absolute?
}