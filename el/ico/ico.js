// icons from directory
// [u2-ico] {
//     --u2-ico-dir:'https://cdn.jsdelivr.net/npm/teenyicons@0.4.1/outline/x-{icon-name}.svg';
// }


/*
const observeStyle = (
	target,
	property,
	callback,
	initialValue = ''
) => {
	let frameId, value
	const css = getComputedStyle(target)
	const observer = () => {
		frameId = requestAnimationFrame(observer)
		value = css.getPropertyValue(property).trim()
		if (value !== initialValue) {
			callback(initialValue = value);
		}
	}
	observer()
	return () => cancelAnimationFrame(frameId)
}
*/

const uIco = class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {

        // observeStyle(this, '--u2-ico-dir', dir => {
        //     this._handleIcon();
        // });

        if (this.firstElementChild) return; // skip if not text-only
        if (!this.hasAttribute('icon')) {
            const inner = this.textContent.trim();
            if (inner) {
                this.setAttribute('icon', inner);
                this.setAttribute('aria-label', inner);
            }
        }

        // at the moment, "loaded" indicates to css, that it uses --u2-ico-dir
        // let font = getComputedStyle(this).getPropertyValue('font-family');
        // if (font) {
        //     font = '1rem '+font;
        //     this.setAttribute('state','loading');
        //     document.fonts.load(font).then(()=>{
        //         this.setAttribute('state','loaded');
        //     }).catch(err=>{
        //         console.error(err);
        //         this.setAttribute('state','fail');
        //     });
        // }
    }
    static get observedAttributes() {
        return ['icon'];
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'icon') {
            requestAnimationFrame(()=>{
                this._handleIcon(); // wait for css to be applied
            });
        }
    }
    _handleIcon() {
        //if (this.firstElementChild) return; // skip if not text-only

        // fetch svg if --ui-ico-directory is set
        let dir = getComputedStyle(this).getPropertyValue('--u2-ico-dir').trim();
        if (dir && this.hasAttribute('icon')) {
            if (dir[0]!=='"' && dir[0]!=="'") console.error('the value of --u2-ico-dir must be surrounded by quotes');
            dir = dir.slice(1, -1);
            const name = this.getAttribute('icon');
            this.setAttribute('icon',name);
            const path = dirTemplateToUrl(dir, name);
            this.setAttribute('state','loading');
            loadSvgString(path).then(svg=>{
                // if (path.origin !== location.origin) {} todo: sanitize svg
                // requestAnimationFrame??
                this.innerHTML = svg;
                this.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id')); // remove ids
                this.setAttribute('state','loaded');
            }).catch(err=>{
                console.error(err);
                this.setAttribute('state','fail');
            });
        }
    }
        

}

customElements.define('u2-ico', uIco);


function dirTemplateToUrl(dir, name) {
    let [prefix, firstWord, between='', nextWord, suffix] = dir.split(/{(icon)([^n]*)?(name)?}/i);
    // old: if (!suffix) suffix = '.svg';
    if (!suffix) {
        suffix = prefix.includes('#') ? '' : '.svg';
    }

    if (!nextWord) between = '-'; // if just: {icon}

    // icon naming convertion
    let fileName = name;
    const upperFirst = firstWord?.[0] === 'I';
    const upperWords = nextWord?.[0] === 'N';
    if (upperFirst) fileName = fileName.replace(/^([a-z])/, g => g[0].toUpperCase()); // first upper
    if (upperWords) fileName = fileName.replace(/-([a-z])/g, g => g[1].toUpperCase()); // camel-case
    if (between !== '-') fileName = fileName.replace(/-/g, between);

    return new URL(prefix + fileName + suffix, location.href);
}

async function loadSvgString(url) {
    const hash = url.hash.substring(1);

    // internal element
    if (url.origin === location.origin && url.pathname === location.pathname) { // svg on the same document
        if (hash) {
            const element = document.getElementById(hash);
            if (element) {
                return element.outerHTML;
            } else {
                throw new Error("Element with id " + hash + " not found in the document");
            }
        }
    }

    const res = await fetch(url, {cache: "force-cache"}); // "force-cache": why is the response not cached like direct in the browser?
    if (!res.ok) throw new Error("Not 2xx response");
    const svg = await res.text();
    
    // external element
    if (hash) { // todo, cache the svgDoc?
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, "image/svg+xml");
        const element = svgDoc.getElementById(hash);
        if (element) {
            return element.outerHTML;
        } else {
            throw new Error("Element with id " + hash + " not found in the document");
        }
    }

    // external document
    return svg;
}


