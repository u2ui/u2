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
                this.ariaLabel = inner;
            }
        }
        this._handleIcon();
    }

    static observedAttributes = ['icon'];
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'icon') {
            setTimeout(() => this._handleIcon(),20); // wait for css to be applied
        }
    }
    _handleIcon() {
        // fetch svg if --ui-ico-directory is set
        let icoDir = getComputedStyle(this).getPropertyValue('--u2-ico-dir').trim();
        if (icoDir && this.hasAttribute('icon')) {
            const dir = icoDir.slice(1, -1);
            const name = this.getAttribute('icon');
            const path = dirTemplateToUrl(dir, name);

            requestAnimationFrame(()=>{
                this.setAttribute('state','loading')
            });

            const pathStr = path.toString();
            if (this._lastLoading === pathStr) return; // prevent multiple requests
            this._lastLoading = pathStr;

            loadSvgString(path).then(svg=>{
                // if (path.origin !== location.origin) {} todo: sanitize svg

                svg = svg.replace(/<!--.*?-->/gs, ''); // remove comments
                svg = svg.replace(/<!DOCTYPE.*?>/gs, ''); // remove doctype
                svg = svg.replace(/<\?xml.*?\?>/gs, ''); // remove xml header

                requestAnimationFrame(()=>{
                    this.innerHTML = svg; // requestAnimationFrame??
                    this.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id')); // remove ids
                    const svgEl = this.firstElementChild;
                    if (!svgEl.hasAttribute('viewBox')) { // SF Symbol
                        const width = parseFloat(svgEl.getAttribute('width')) ?? 24;
                        const height = parseFloat(svgEl.getAttribute('height')) ?? 24;
                        svgEl.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
                    }
                    ['xmlns','xmlns:xlink','version','class','width','height'].forEach(attr=>svgEl.removeAttribute(attr)); // remove width, height ok?
                    svgEl.ariaHidden = true;
                    this.setAttribute('state','loaded');
                    this.dispatchEvent(new CustomEvent('u2-ico-loaded', {bubbles: true, composed: true}));
                });

            }).catch(err=>{
                console.error(err, this);
                this.setAttribute('state','fail');
            });
        }
    }

}

function dirTemplateToUrl(dir, name) {
    let [prefix, firstWord, between='', nextWord, suffix] = dir.split(/{(icon)([^n]*)?(name)?}/i);
    if (!suffix) suffix = prefix.includes('#') ? '' : '.svg';
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

    const svg = await loadCached(url);
    // temporary cache svg
    
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

const cachedRequests = {};

async function loadCached(url) {
    if (cachedRequests[url]) return cachedRequests[url];
    cachedRequests[url] = fetch(url, {cache: "force-cache"}).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch icon ${url}: ${res.status} ${res.statusText}`);
        return res.text();
    });
    return cachedRequests[url];
}


customElements.define('u2-ico', uIco);
