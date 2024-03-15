const throttle = (func, ms) => {
    let timeOut;
    return (...args) => {
        if (timeOut) return;
        timeOut = setTimeout(()=>{
            requestAnimationFrame(()=>{
                func(...args);
                timeOut = null;
            });
        }, ms);
    }
}

class textfit extends HTMLElement {
    constructor() {
        super();
        let shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `
        <style>
        slot { display:block }
        </style>
        <slot></slot>
        `;
        this.slotEl = shadowRoot.querySelector('slot');

        this.render = throttle(this.render.bind(this), 20);
        //this.render = this.render.bind(this);

        this.addEventListener('input',this.render); // contenteditable
        addEventListener('load',this.render); // e.g. font switch
        this._rObserver = new ResizeObserver(this.render);  // todo? render can in turn trigger the observer, should we intercept that?
    }

    connectedCallback() {
        this.render();
        this._rObserver && this._rObserver.observe(this);
    }
    disconnectedCallback() {
        removeEventListener('load',this.render); // e.g. font switch
        this._rObserver.disconnect(this);
    }

    render(e){
        const style = getComputedStyle(this);
        const font   = style.getPropertyValue('font-family');
        const weight = style.getPropertyValue('font-weight');
        const fStyle = style.getPropertyValue('font-style');
        const canvas = document.createElement('canvas');
        const c2d = canvas.getContext('2d');
        c2d.direction = 'ltr';
        c2d.font = fStyle + ' ' + weight + ' 100px ' + font;
        const text = this.innerText;
        const measure = c2d.measureText(text);
        const left  = measure.actualBoundingBoxLeft;
        const right = measure.actualBoundingBoxRight;
        //const ascent = measure.actualBoundingBoxAscent;
        //const descent = measure.actualBoundingBoxDescent;

        this.slotEl.style.marginLeft = left/100 + 'em';

        const widthAt100px = right + left;
        const space = this.clientWidth; // how wide is the content, with the smallest font-size possible
        let fs = (space / widthAt100px) * 100

        this.style.setProperty('--gen-font-size', fs+'px');
    }
}

customElements.define('u1-textfit', textfit);
