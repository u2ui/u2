// u2-drawer Custom Element
class U2Drawer extends HTMLElement {
    constructor() {
        super();
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.isDragging = false;
    }

    connectedCallback() {
        const placement = this.getAttribute('placement') || 'right';

        if (!this.hasAttribute('popover')) this.setAttribute('popover', 'auto');

        this.swipeConfig = {
            right: { open: 'translateX(0)', closed: 'translateX(100%)' },
            left: { open: 'translateX(0)', closed: 'translateX(-100%)' },
            top: { open: 'translateY(0)', closed: 'translateY(-100%)' },
            bottom: { open: 'translateY(0)', closed: 'translateY(100%)' }
        };

        this.update();
        this.setupSwipe();
    }

    get placement(){ return this.getAttribute('placement') || 'right'; }

    update() {
        if (this.hasAttribute('contained')) {
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = `
                <slot class="wrapper"></slot>
                <div class="backdrop"></div>
                <style>
                :host {
                     visibility: hidden !important;
                     position:absolute;
                     inset:0 !important;
                     transform:none !important;
                     z-index:99999;
                     xanchor-name: --box; /* not working cross light/shadow dom :( */
                }
                .backdrop {
                    visibility: visible;
                    position:absolute;
                    inset:0;
                    background: #0002;
                    z-index:1;
                    opacity:0;
                    transition:inherit;
                    transition-property:opacity;
                }
                :host(.xOpen) > .backdrop { opacity:1; }
                .wrapper {
                    all:inherit;
                    visibility: visible;
                    inset: 0 0 0 0;
                    xposition-anchor: --box;
                    xposition-area:center center;
                    xheight:100%;
                    xwidth:100%;
                }

                :host([placement="right"]) > .wrapper { transform: translateX(100%); }
                :host([placement="left"]) > .wrapper { transform: translateX(-100%); }
                :host([placement="top"]) > .wrapper { transform: translateY(-100%); }
                :host([placement="bottom"]) > .wrapper { transform: translateY(100%); }

                :host([placement="right"].xOpen) > .wrapper {
                    left: auto;
                    width: fit-content;
                    transform: translateX(0);
                }
                :host([placement="left"].xOpen) > .wrapper {
                    right: auto;
                    width: fit-content;
                    transform: translateX(0);
                }
                :host([placement="top"].xOpen) > .wrapper {
                    bottom: auto;
                    width: fit-content;
                    transform: translateY(0);
                }
                :host([placement="bottom"].xOpen) > .wrapper {
                    top: auto;
                    width: fit-content;
                    transform: translateY(0);
                }
            `
            this.addEventListener('beforetoggle', e => {
                if (e.newState === "open") {
                    this.removeAttribute('popover');
                    this.classList.add('xOpen');
                } else {
                    this.setAttribute('popover', 'auto');
                    this.classList.remove('xOpen');
                }
            });
        }
    }

    setupSwipe() {
        this.addEventListener('touchstart', (e) => {
            if (!this.matches(':popover-open')) return;

            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
            this.isDragging = true;
            this.style.transition = 'none';
        });

        this.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            const placement = this.placement;

            this.currentX = e.touches[0].clientX;
            this.currentY = e.touches[0].clientY;

            const deltaX = this.currentX - this.startX;
            const deltaY = this.currentY - this.startY;

            // Only allow swipe in close direction
            if ((placement === 'right' && deltaX > 0) ||
                (placement === 'left' && deltaX < 0) ||
                (placement === 'top' && deltaY < 0) ||
                (placement === 'bottom' && deltaY > 0)) {

                if (placement === 'right' || placement === 'left') {
                    this.style.transform = `translateX(${deltaX}px)`;
                } else {
                    this.style.transform = `translateY(${deltaY}px)`;
                }
            }
        });

        this.addEventListener('touchend', () => {
            if (!this.isDragging) return;
            const placement = this.placement;
            this.isDragging = false;

            this.style.transition = '';

            const deltaX = this.currentX - this.startX;
            const deltaY = this.currentY - this.startY;
            const threshold = 100;

            const shouldClose =
                (placement === 'right' && deltaX > threshold) ||
                (placement === 'left' && deltaX < -threshold) ||
                (placement === 'top' && deltaY < -threshold) ||
                (placement === 'bottom' && deltaY > threshold);

            if (shouldClose) {
                this.hidePopover();
            } else {
                const config = this.swipeConfig[placement];
                this.style.transform = config.open;
            }
        });
    }
}

// Register custom element
customElements.define('u2-drawer', U2Drawer);