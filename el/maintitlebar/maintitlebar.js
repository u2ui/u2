export default class U2Maintitlebar extends HTMLElement {
    constructor() {
        super();
        this._check = this._check.bind(this);
    }
    _check() {
        this.hidden = !navigator.windowControlsOverlay?.visible;
    }
    connectedCallback() {
        this._check();
        navigator.windowControlsOverlay?.addEventListener('geometrychange', this._check);
    }
    disconnectedCallback() {
        navigator.windowControlsOverlay?.removeEventListener('geometrychange', this._check);
    }
}
customElements.define('u2-maintitlebar', U2Maintitlebar);