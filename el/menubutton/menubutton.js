class menubutton extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        setTimeout(async () => {
            import('../../attr/focusgroup/focusgroup.js');

            const menu = this.querySelector('menu');
            //menu.slot = 'menu';
            menu.role = 'menu';
            menu.setAttribute('u2-focusgroup', 'remember');
            //menu.setAttribute('popover', 'manual');
            // set id if hat not
            if (!menu.id) {
                menu.id = 'menu' + Math.random().toString().slice(2);
            }

            const button = this.querySelector('button');
            button.setAttribute('popovertarget', menu.id);


        }, 0);
    }
}
customElements.define('u2-menubutton', menubutton);
