// u2-menu.js
export class U2Menu {
    constructor(role = 'menu') {
        this.role = role;
        this.optionRole = role === 'menu' ? 'menuitem' : 'option';
        this.items = [];
        this.activeIndex = -1;

        // Create element
        this.element = role === 'menu' ? document.createElement('menu') : document.createElement('div');
        this.element.part = 'menu';
        if (role !== 'menu') this.element.role = role;
        this.element.id = `u2-menu-${Math.random().toString(36).substr(2, 9)}`;

        // Lifecycle
        this.element.addEventListener('toggle', e => {
            if (e.newState === 'open') {
                this.navigate('first');
            } else {
                this.activeIndex = -1;
                this.element.ariaActiveDescendant = null;
            }
        });
    }

    _getEnabledItems() {
        return this.items.filter(item =>
            item.ariaDisabled !== 'true' && item.role !== 'separator'
        );
    }

    get(direction) {
        const enabled = this._getEnabledItems();
        if (!enabled.length) return null;

        const current = enabled.findIndex(item => item.part.contains('active'));

        const actions = {
            'active': () => enabled.find(item => item.part.contains('active')) || null,
            // 'next': () => enabled[(current + 1) % enabled.length],
            // 'prev': () => enabled[(current - 1 + enabled.length) % enabled.length],
            'next': () => enabled[Math.min(current + 1, enabled.length - 1)],
            'prev': () => enabled[Math.max(current - 1, 0)],
            'first': () => enabled[0],
            'last': () => enabled[enabled.length - 1]
        };

        return actions[direction]?.() || null;
    }

    navigate(direction) {
        const element = this.get(direction);
        if (element) this.setActive(element);
    }

    setActive(element) {
        if (!element || !this.items.includes(element)) return;

        this.items.forEach(item => item.part.remove('active'));
        element.part.add('active');
        this.activeIndex = parseInt(element.dataset.idx);
        this.element.ariaActiveDescendantElement = element; // needed? input also has it
        element.dispatchEvent(new CustomEvent('u2Menu-active', { bubbles: true, detail: { element } }));
        element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }

    select(element) {
        element ||= this.get('active');
        if (!element) return;
        element.dispatchEvent(new CustomEvent('u2Menu-select', {
            bubbles: true,
            detail: { index: parseInt(element.dataset.idx), element }
        }));
    }

    addItem(element, options = {}) {
        if (this.role === 'menu' && element.tagName !== 'LI') {
            console.warn('u2-menu: <menu> should contain <li> elements');
        }

        element.id ||= `${this.element.id}-item-${this.items.length}`;

        // Separator
        if (options.separator) {
            element.role = 'separator';
            element.part = 'separator';
            this.element.appendChild(element);
            this.items.push(element);
            return element;
        }

        element.role = this.optionRole;
        element.part = 'option';
        element.dataset.idx = this.items.length;

        // Disabled
        if (options.disabled) {
            element.ariaDisabled = 'true';
            element.part.add('disabled');
        } else {
            element.onmouseenter = () => this.setActive(element);
            element.onclick = () => this.select(element);
        }

        this.element.appendChild(element);
        this.items.push(element);
        return element;
    }

    setSelected(index, selected = true) {
        const item = this.items[index];
        if (!item) return;

        if (selected) {
            if (!this.multiSelect) this.items.forEach(i => i.ariaSelected = null);
            item.ariaSelected = 'true';
            item.part.add('selected');
        } else {
            item.ariaSelected = null;
            item.part.remove('selected');
        }
    }

    setDisabled(index, disabled) {
        const item = this.items[index];
        if (!item) return;

        if (disabled) {
            item.ariaDisabled = true;
            item.part.add('disabled');
            item.onmouseenter = item.onclick = null;
        } else {
            item.ariaDisabled = null;
            item.part.remove('disabled');
            item.onmouseenter = () => this.setActive(item);
            item.onclick = () => item.dispatchEvent(new CustomEvent('select', {
                bubbles: true,
                detail: { index, element: item }
            }));
        }
    }

    clear() {
        this.element.innerHTML = '';
        this.items = [];
        this.activeIndex = -1;
        this.element.ariaActiveDescendant = null;
    }
}

export default U2Menu;