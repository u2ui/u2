
export default class U2Menubutton extends HTMLElement {
    connectedCallback() {
        import('../../attr/focusgroup/focusgroup.js');
        if (this._init) return; // listeners live on the element itself, so setup runs once, not per reconnect
        this._init = true;
        setTimeout(() => {

            const menu = this.querySelector('menu');

            menu.setAttribute('u2-focusgroup', 'remember');
            menu.setAttribute('popover', 'auto');

            let button = this.querySelector(':scope > button');
            if (!button) {
                button = document.createElement('button');
                button.innerHTML = '⋮'; // other variants: '⯆', '⯈', '⯇', '⠇'
                this.prepend(button);
            }

            //button.popovertarget = menu;

            button.type = 'button';
            button.ariaHasPopup = 'menu';
            button.addEventListener('click', () => this.toggle());
            button.addEventListener('keydown', (e) => { // keyup?
                if (e.key === 'ArrowDown') {
                    this.open();
                    nextFocusable(this.querySelector(':scope > menu')).focus();
                    e.preventDefault();
                }
            });
            menu.addEventListener('toggle', e => {
                button.ariaExpanded = e.newState === 'open';
            });

            this.addEventListener('focusout', (e) => { // popover makes this not?
               !this.contains(e.relatedTarget) && menu.hidePopover();
            });

            const openby = (v) => this.getAttribute('openby')?.includes(v);
            this.addEventListener('mouseenter', () => {
                if (openby('hover')) this._openTimer = setTimeout(() => this.open(), 140);
            });
            this.addEventListener('mouseleave', () => {
                clearTimeout(this._openTimer);
                openby('hover') && this.close();
            });
            this.addEventListener('focusin', () => {
                openby('focus') && this.open()
            });

            this.menu = menu;
            this.button = button;

        }, 0);
    }
    open() {
        this.menu.style.minWidth = this.button.offsetWidth+'px';
        this.menu.showPopover();
        this._place();
    }
    close() {
        this.menu.hidePopover();
    }
    toggle() {
        this.menu.matches(':popover-open') ? this.close() : this.open();
    }
    _place() {
        import('../../js/Placer/Placer.js').then(({Placer}) => {
            const placer = new Placer(this.menu, { x:'append', y:'after', margin:0 });
            placer.toElement(this.button);
        });
    }
}
customElements.define('u2-menubutton', U2Menubutton);


function nextFocusable(root) {
  return root.querySelector(`
    :where(
      button,
      [href],
      input,
      select,
      textarea,
      [tabindex]:not([tabindex="-1"])
    ):not([disabled]):not([hidden])
  `);
}
