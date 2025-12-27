
class menubutton extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        import('../../attr/focusgroup/focusgroup.js');
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

            if (!button._initialized) {
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
            }
            button._initialized = true;

            this.addEventListener('focusout', (e) => { // popover makes this not?
               !this.contains(e.relatedTarget) && menu.hidePopover();
            });

            // openby hover
            let _openTimer;
            this.addEventListener('mouseenter', () => {
                if (this.getAttribute('openby')?.includes('hover')) {
                    this._openTimer = setTimeout(() => this.open(), 140);
                }
            });
            this.addEventListener('mouseleave', () => {
                clearTimeout(this._openTimer);
                this.getAttribute('openby')?.includes('hover') && this.close();
            });

            // openby focus
            this.addEventListener('focusin', () => {
                this.getAttribute('openby')?.includes('focus') && this.open()
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
customElements.define('u2-menubutton', menubutton);


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
