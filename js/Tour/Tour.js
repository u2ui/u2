import { Placer } from '../Placer/Placer.js';

export class Tour extends EventTarget {
    constructor(steps) {
        super();
        this.steps = steps;
    }

    start() { this.show(0); }

    show(index) {
        const step = this.steps[index];
        if (!step) return;

        this.target = typeof step.target === 'string' ? document.querySelector(step.target) : step.target;
        if (!this.target) throw new Error(`Tour target not found: ${step.target}`);
        const opened = !this.info;
        if (opened) this.#create();

        this.current = index;
        this.content.replaceChildren(step.content instanceof Node ? step.content.cloneNode(true) : step.content);
        this.info.ariaLabel = `Tour step ${index + 1} of ${this.steps.length}`;
        this.backButton.disabled = index === 0;
        this.nextButton.textContent = index === this.steps.length - 1 ? 'Done' : 'Next';
        this.target.scrollIntoView({block:'nearest', inline:'nearest'});
        this.placer.followElement(this.target);
        this.#draw();
        if (opened) this.nextButton.focus();
        this.dispatchEvent(new CustomEvent('step', {detail:{step, index}}));
    }

    next() { this.current === this.steps.length - 1 ? this.stop('complete') : this.show(this.current + 1); }
    back() { this.show(this.current - 1); }

    stop(event = 'close') {
        this.placer?.unfollow();
        this.host?.remove();
        document.removeEventListener('scroll', this.#scheduleDraw, true);
        globalThis.removeEventListener('resize', this.#scheduleDraw);
        cancelAnimationFrame(this.drawFrame);
        this.drawFrame = 0;
        this.host = this.info = this.target = null;
        if (this.returnFocus?.isConnected) this.returnFocus.focus();
        this.returnFocus = null;
        this.dispatchEvent(new Event(event));
    }

    #create() {
        import('../../attr/focusgroup/focusgroup.js');
        this.returnFocus = document.activeElement;
        const host = this.host = document.createElement('div');
        document.documentElement.append(host);
        host.popover = 'manual';
        host.style.cssText = `
            xposition: fixed !important;
            xinset: 0 !important;
            pointer-events: none !important;
            border:0; padding:0; margin:0;
        `;

        const root = host.attachShadow({mode:'closed'});
        root.innerHTML = `
            <style>
                svg {
                    position: fixed;
                    inset: 0;
                    width: 120%;
                    height: 120%;
                }
                .hole { transition: all .15s; filter:blur(4px); }
                slot { pointer-events: none; }
            </style>
            <svg aria-hidden=true focusable=false>
                <defs>
                    <mask id=spotlight>
                        <rect width="100%" height="100%" fill="white"/>
                        <rect class=hole rx=8 fill="black"/>
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="#000a" mask="url(#spotlight)"/>
            </svg>
            <slot></slot>
        `;
        host.showPopover();

        this.hole = root.querySelector('.hole');
        document.addEventListener('scroll', this.#scheduleDraw, {passive:true, capture:true});
        globalThis.addEventListener('resize', this.#scheduleDraw, {passive:true});

        const info = this.info = document.createElement('dialog');
        info.className = 'u2TourInfo';
        info.open = true;
        info.style.cssText = `
            position: fixed !important;
            pointer-events: auto;
            margin: 0;
            margin-left:3px;
        `;
        info.innerHTML = `
            <div style="margin-bottom:1em;">
                <button class="u2-unstyle u2TourClose" aria-label="Close tour" style="float:right;">
                    <u2-ico icon=close>&times;</u2-ico>
                </button>
                <div aria-live=polite aria-atomic=true class=u2TourContent></div>
            </div>
            <footer class=u2-flex u2-focusgroup style="justify-content:space-between;">
                <button class=u2TourBack>Back</button>
                <button class=u2TourNext>Next</button>
            </footer>
        `;
        info.onkeydown = e => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            this.stop();
        };
        host.append(info);
        this.content = info.querySelector('.u2TourContent');
        [this.closeButton, this.backButton, this.nextButton] = info.querySelectorAll('button');
        this.backButton.onclick = () => this.back();
        this.nextButton.onclick = () => this.next();
        this.closeButton.onclick = () => this.stop();
        this.placer = new Placer(info, {margin:15});
    }

    #draw() {
        if (!this.target) return;
        const {left, top, width, height} = this.target.getBoundingClientRect();
        const margin = 7;
        Object.assign(this.hole.style, {
            x: `${left - margin}px`,
            y: `${top - margin}px`,
            width: `${width + margin * 2}px`,
            height: `${height + margin * 2}px`,
        });
    }

    #scheduleDraw = () => {
        if (this.drawFrame) return;
        this.drawFrame = requestAnimationFrame(() => {
            this.drawFrame = 0;
            this.#draw();
        });
    };
}
