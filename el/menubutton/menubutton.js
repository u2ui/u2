
class menubutton extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        setTimeout(async () => {
            import('../../attr/focusgroup/focusgroup.js');

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


            button.addEventListener('click', () => {
                if (menu.matches(':popover-open')) {
                    menu.hidePopover();
                } else {
                    this.open();
                }
            });
            button.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    this.open();
                    this.querySelector(':scope > menu button').focus();
                    e.preventDefault();
                }
            });

            this.addEventListener('focusout', (e) => {
                if (!this.contains(e.relatedTarget)) {
                    menu.hidePopover();
                }
            });

            this.menu = menu;
            this.button = button;

        }, 0);
    }
    open() {
        this.menu.showPopover();
        this._place();
    }
    _place() {
        import('../../js/Placer/Placer.js').then(({Placer}) => {
            const placer = new Placer(this.menu, { x:'append', y:'after', margin:3 });
            placer.toElement(this.button);
        });
    }
}
customElements.define('u2-menubutton', menubutton);
