export class SelectionManager {
    constructor(container, config = {}) {
        this.container = container;
        this.config = {
            preferSingle: false,
            ...config
        };
        this.last = null; // Last focused item
        this.anchor = null; // Anchor for Range-Selection

        container.addEventListener('click', this);
        container.addEventListener('keydown', this);

        const items = this.items();
        let firstTabIndex0 = null;
        let firstSelected = null;
        for (const item of items) {
            if (item.tabIndex === 0) {
                firstTabIndex0 = item;
                break;
            }
            if (item.ariaSelected === 'true' && firstSelected == null) firstSelected = item;
        }
        const focusable = firstTabIndex0 || firstSelected || items[0];
        if (focusable) {
            focusable.tabIndex = 0;
            this.last = this.anchor = focusable;
        }
    }

    destroy() {
        this.container.removeEventListener('click', this);
        this.container.removeEventListener('keydown', this);
    }

    items() {
        return getOwnItems(this.container);
    }

    get multi() { return this.container.ariaMultiSelectable === 'true'; }

    handleEvent(e) { this['on' + e.type](e); }

    onclick(e) {
        const items = this.items();
        const item = e.composedPath().find(el => items.includes(el));
        if (!item) return;

        if (this.multi) {
            if (e.shiftKey && this.anchor) {
                this.clear();
                this.range(this.anchor, item);
            } else if (e.ctrlKey || e.metaKey) {
                this.toggle(item);
            } else {
                this.config.preferSingle ? this.only(item) : this.toggle(item);
            }
        } else {
            this.only(item);
        }

        this.focus(item);        
    }

    onkeydown(e) {
        const items = this.items();
        const current = items.find(el => el === document.activeElement);

        const idx = items.indexOf(current);

        const nav = {
            ArrowDown: () => items[Math.min(idx + 1, items.length - 1)],
            ArrowRight: () => items[Math.min(idx + 1, items.length - 1)],
            ArrowUp: () => items[Math.max(idx - 1, 0)],
            ArrowLeft: () => items[Math.max(idx - 1, 0)],
            Home: () => items[0],
            End: () => items[items.length - 1]
        }[e.key];

        if (nav && !e.altKey) {
            const next = nav();
            e.preventDefault();
            this.focus(next);

            if (this.multi) {
                if (e.shiftKey) {
                    this.clear();
                    this.range(this.anchor || current, next);
                }
            } else {
                this.only(next);
            }
        }

        if (e.key === 'a' && this.multi && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            items.forEach(el => this.add(el));
        }

        if (!current) return;

        if (e.key === ' ') {
            e.preventDefault();
            if (this.multi) {
                if (e.shiftKey) {
                    this.clear();
                    this.range(this.anchor || items[0], current);
                } else {
                    this.toggle(current);
                }
            } else {
                this.only(current);
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            this.only(current);
        }

    }

    focus(item) {
        if (this.last) this.last.tabIndex = -1;
        item.tabIndex = 0;
        item.focus();
        this.last = item;
    }

    range(from, to) {
        const items = this.items();
        const [a, b] = [items.indexOf(from), items.indexOf(to)].sort((x, y) => x - y);
        items.slice(a, b + 1).forEach(el => this.add(el));
    }

    only(item) { this.clear(); this.add(item); this.anchor = item; }

    toggle(item) { item.ariaSelected === 'true' ? this.remove(item) : this.add(item); this.anchor = item; }

    clear(){ this.items().forEach(el => this.remove(el)); }

    add(item) { item.ariaSelected = 'true'; }

    remove(item) { item.ariaSelected = 'false'; }
}



const roleMap = {
    listbox: ['option'],
    grid: ['row', 'gridcell'],
    treegrid: ['row', 'gridcell'],
    tree: ['treeitem'],
    tablist: ['tab']
};
function getOwnItems(container) {
    const validRoles = roleMap[container.role];
    if (!validRoles) return [];
    const items = [];
    function scan(root) {
        for (const node of root.children) {
            if (node.ariaHidden === 'true') continue;
            const role = node.role;
            if (role && validRoles.includes(role)) items.push(node);
            if (role && roleMap[role]) continue;
            scan(node.shadowRoot || node);
        }
    }
    scan(container);
    return items;
}