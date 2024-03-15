class splitbutton extends HTMLElement {
    constructor() {
        super();
        // const shadow = this.attachShadow({mode: 'open'});
        // shadow.innerHTML = `
        //     <span class=flex>
        //         <slot></slot>
        //         <span class=menu>
        //             <slot name="icon"><span style="font-size:.5em">▼</span></slot>
        //             <slot name="menu"></slot>
        //         </span>
        //     </span>

        //     <style>
        //         .flex {
        //             display: inline-flex;
        //         }
        //         .menu {
        //             display: grid;
        //             place-items: center;
        //             background-color: var(--color);
        //             padding: .1em .7em;
        //             cursor:pointer;
        //             margin-left:1px;
        //             border-radius: var(--radius);
        //             border-top-left-radius: 0;
        //             border-bottom-left-radius: 0;
        //             color: var(--color-bg);
        //         }
        //         .menu:focus-within {
        //             outline: none;
        //             background-color:red;
        //         }
        //         ::slotted(button) {
        //             border-top-right-radius: 0 !important;
        //             border-bottom-right-radius: 0 !important;
        //         }
        //     </style>
        // `;
    }
    connectedCallback() {
        setTimeout(async () => {
            const menu = this.querySelector('menu');
            menu.slot = 'menu';
            menu.setAttribute('u1-focusgroup', 'remember');
            import('../../attr/focusgroup/focusgroup.js');
        }, 0);
    }
}
customElements.define('u1-splitbutton', splitbutton);
