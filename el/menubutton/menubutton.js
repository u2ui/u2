
class menubutton extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        import('../../attr/focusgroup/focusgroup.js');
        setTimeout(() => {

            const menu = this.querySelector('menu');

            menu.role = 'menu';
            menu.setAttribute('u2-focusgroup', 'remember');
            menu.setAttribute('popover', 'auto');
            //if (!menu.id) menu.id = 'menu' + Math.random().toString().slice(2);  // set id if not set

            let button = this.querySelector(':scope > button');
            if (!button) {
                button = document.createElement('button');
                button.innerHTML = '▾'; // other variants: '⯆', '⯈', '⯇', '
                this.prepend(button);
            }

            //button.setAttribute('popovertarget', menu.id);

            if (!button._initialized) {
                button.type = 'button';
                button.addEventListener('click', () => this.open());
                button.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown') {
                        this.open();
                        //this.querySelector(':scope > menu button').focus();
                        nextFocusable(this.querySelector(':scope > menu')).focus();
                        e.preventDefault();
                    }
                });
            }
            button._initialized = true;

            //this.addEventListener('focusout', (e) => { // popover makes this
            //    !this.contains(e.relatedTarget) && menu.hidePopover();
            //});

            this.menu = menu;
            this.button = button;

        }, 0);
    }
    open() {
        //let button = this.querySelector(':scope > button');
        this.menu.style.minWidth = this.button.offsetWidth+'px';
        this.menu.showPopover();
        this._place();
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
