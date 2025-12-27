// zur inspiration
// gute gemacht, einiges brauchbar

// Zentrale Registry für alle Widget-Instanzen
const registry = new WeakMap();

// Factory-Funktion für alle Widget-Typen
export function getWidget(el, WidgetClass) {
    return registry.get(el) ?? registry.set(el, new WidgetClass(el)).get(el);
}

// Basisklasse für Container (Menu, Select, Tree, etc.)
class Container {
    // Überschreibbar in Subklassen
    static role = 'menu';
    static itemRole = 'menuitem';
    static itemSelector = ':scope > li';
    static parentSelector = 'li';
    static expandedAttr = 'aria-expanded';
    
    constructor(el) {
        this.el = el;
        this._ItemClass = this.constructor.ItemClass;
    }
    
    get parentItem() {
        const parent = this.el.parentElement;
        return parent?.matches(this.constructor.parentSelector) 
            ? getWidget(parent, this._ItemClass) 
            : null;
    }
    
    get items() {
        return [...this.el.querySelectorAll(this.constructor.itemSelector)]
            .map(el => getWidget(el, this._ItemClass));
    }
    
    get visibleItems() {
        return this.items.filter(item => !item.isHidden);
    }
    
    get enabledItems() {
        return this.visibleItems.filter(item => !item.isDisabled);
    }
    
    open() {
        this.parentItem?.el.setAttribute(this.constructor.expandedAttr, 'true');
        this.onOpen();
    }
    
    close() {
        this.parentItem?.el.removeAttribute(this.constructor.expandedAttr);
        this.items.forEach(item => item.subContainer?.close());
        this.onClose();
    }
    
    // Hooks für Subklassen
    onOpen() {}
    onClose() {}
}

// Basisklasse für Items (MenuItem, TreeNode, Option, etc.)
class Item {
    // Überschreibbar in Subklassen
    static containerSelector = 'menu,ul';
    static subContainerSelector = ':scope > :is(menu,ul)';
    static expandedAttr = 'aria-expanded';
    
    constructor(el) {
        this.el = el;
        this._ContainerClass = this.constructor.ContainerClass;
    }
    
    get container() {
        const parent = this.el.parentElement;
        return parent?.matches(this.constructor.containerSelector)
            ? getWidget(parent, this._ContainerClass)
            : null;
    }
    
    get subContainer() {
        const el = this.el.querySelector(this.constructor.subContainerSelector);
        return el ? getWidget(el, this._ContainerClass) : null;
    }
    
    get siblings() {
        return this.container?.items ?? [];
    }
    
    get index() {
        return this.siblings.indexOf(this);
    }
    
    get next() {
        const siblings = this.siblings;
        return siblings[this.index + 1];
    }
    
    get prev() {
        return this.siblings[this.index - 1];
    }
    
    get first() {
        return this.siblings[0];
    }
    
    get last() {
        return this.siblings[this.siblings.length - 1];
    }
    
    get isExpanded() {
        return this.el.getAttribute(this.constructor.expandedAttr) === 'true';
    }
    
    get isDisabled() {
        return this.el.hasAttribute('aria-disabled') || 
               this.el.disabled || 
               this.el.inert;
    }
    
    get isHidden() {
        const style = getComputedStyle(this.el);
        return style.display === 'none' || style.visibility === 'hidden';
    }
    
    get isSelected() {
        return this.el.hasAttribute('aria-selected') || 
               this.el.getAttribute('aria-checked') === 'true';
    }
    
    expand() {
        if (this.isExpanded || !this.subContainer) return;
        this.siblings.forEach(sibling => sibling.collapse());
        this.subContainer.open();
        this.onExpand();
    }
    
    collapse() {
        if (!this.isExpanded) return;
        this.subContainer?.close();
        this.onCollapse();
    }
    
    toggle() {
        this.isExpanded ? this.collapse() : this.expand();
    }
    
    select() {
        this.el.setAttribute('aria-selected', 'true');
        this.onSelect();
    }
    
    deselect() {
        this.el.removeAttribute('aria-selected');
        this.onDeselect();
    }
    
    focus() {
        const focusable = this.firstFocusable();
        focusable?.focus();
    }
    
    firstFocusable() {
        return findFirstFocusable(this.el, this.subContainer?.el);
    }
    
    // Hooks für Subklassen
    onExpand() {}
    onCollapse() {}
    onSelect() {}
    onDeselect() {}
}

// ============ Konkrete Implementierungen ============

// Menu
class Menu extends Container {
    static role = 'menu';
    static itemSelector = ':scope > li';
    static parentSelector = 'li';
    static ItemClass = MenuItem;
}

class MenuItem extends Item {
    static containerSelector = 'menu,ul';
    static subContainerSelector = ':scope > :is(menu,ul)';
    static ContainerClass = Menu;
}

// Tree
class Tree extends Container {
    static role = 'tree';
    static itemSelector = ':scope > li';
    static parentSelector = 'li';
    static ItemClass = TreeNode;
}

class TreeNode extends Item {
    static containerSelector = 'ul';
    static subContainerSelector = ':scope > ul';
    static ContainerClass = Tree;
}

// Select/Listbox
class Listbox extends Container {
    static role = 'listbox';
    static itemSelector = ':scope > [role="option"]';
    static parentSelector = 'li';
    static ItemClass = Option;
    
    get selectedItems() {
        return this.items.filter(item => item.isSelected);
    }
    
    get selectedItem() {
        return this.selectedItems[0];
    }
}

class Option extends Item {
    static containerSelector = '[role="listbox"]';
    static subContainerSelector = null; // Options haben keine Sub-Container
    static ContainerClass = Listbox;
    
    onSelect() {
        // Single-select: andere deselektieren
        if (!this.container.el.hasAttribute('aria-multiselectable')) {
            this.siblings.forEach(sibling => {
                if (sibling !== this) sibling.deselect();
            });
        }
    }
}

// Combobox
class Combobox extends Container {
    static role = 'combobox';
    static itemSelector = '[role="option"]';
    static ItemClass = ComboboxOption;
    
    constructor(el) {
        super(el);
        this.input = el.querySelector('input');
    }
    
    get filteredItems() {
        const value = this.input?.value.toLowerCase() ?? '';
        return this.items.filter(item => 
            item.el.textContent.toLowerCase().includes(value)
        );
    }
}

class ComboboxOption extends Item {
    static containerSelector = '[role="combobox"]';
    static ContainerClass = Combobox;
}

// Navigation
class Navigation extends Container {
    static role = 'navigation';
    static itemSelector = ':scope > li, :scope > a';
    static parentSelector = 'li';
    static ItemClass = NavItem;
}

class NavItem extends Item {
    static containerSelector = 'nav,ul';
    static subContainerSelector = ':scope > ul';
    static ContainerClass = Navigation;
    
    get href() {
        const link = this.el.matches('a') ? this.el : this.el.querySelector('a');
        return link?.href;
    }
}

// ============ Hilfsfunktionen ============

function findFirstFocusable(root, exclude) {
    for (const child of root.children) {
        if (child === exclude) continue;
        if (isFocusable(child)) return child;
        const found = findFirstFocusable(child, exclude);
        if (found) return found;
    }
}

function isFocusable(el) {
    if (el.disabled || el.inert || el.closest('[inert]')) return false;
    if (el.getAttribute('tabindex') === '-1') return false;
    
    if (!el.matches(
        'button, [tabindex], a[href], ' +
        'input:not([type="hidden"]), select, textarea, ' +
        'details, [contenteditable], audio[controls], video[controls]'
    )) return false;
    
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

// ============ Public API ============

export function getMenu(el) { return getWidget(el, Menu); }
export function getMenuItem(el) { return getWidget(el, MenuItem); }
export function getTree(el) { return getWidget(el, Tree); }
export function getTreeNode(el) { return getWidget(el, TreeNode); }
export function getListbox(el) { return getWidget(el, Listbox); }
export function getOption(el) { return getWidget(el, Option); }
export function getCombobox(el) { return getWidget(el, Combobox); }
export function getNavigation(el) { return getWidget(el, Navigation); }
export function getNavItem(el) { return getWidget(el, NavItem); }

// Oder generisch:
export { getWidget };