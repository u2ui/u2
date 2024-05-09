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
            this.setAttribute('state','loading');

            const pathStr = path.toString();
            if (this._lastLoading === pathStr) return; // prevent multiple requests
            this._lastLoading = pathStr;

            loadSvgString(path).then(svg=>{
                // if (path.origin !== location.origin) {} todo: sanitize svg

                svg = svg.replace(/<!--.*?-->/gs, ''); // remove comments
                svg = svg.replace(/<!DOCTYPE.*?>/gs, ''); // remove doctype
                svg = svg.replace(/<\?xml.*?\?>/gs, ''); // remove xml header

                this.innerHTML = svg; // requestAnimationFrame??
                this.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id')); // remove ids
                const svgEl = this.firstElementChild;
                svgEl.removeAttribute('xmlns');
                svgEl.removeAttribute('xmlns:xlink');
                svgEl.removeAttribute('version');
                svgEl.setAttribute('aria-hidden', 'true');
                this.setAttribute('state','loaded');

                // // store to combine
                // queueMicrotask(()=>{
                //     const store = localStorage.getItem('u2-ico-used');
                //     const icons = store ? JSON.parse(store) : {};
                //     icons[icoDir] ??= {};
                //     icons[icoDir][name] = this.innerHTML.trim();
                //     localStorage.setItem('u2-ico-used', JSON.stringify(icons));
                // });

            }).catch(err=>{
                console.error(err, this);
                this.setAttribute('state','fail');
            });
        }
    }
        

}

// //combine svgs
// setTimeout(function(){
//     const store = localStorage.getItem('u2-ico-used');
//     if (!store) return;
//     const icons = JSON.parse(store);
//     for (const [dir, names] of Object.entries(icons)) {
//         console.log(`instead of loading from ${dir}, you can generate a local file with to following content and load it like /myFile.txt#{icon}:`);
//         let content = '<svg><defs>\n\n';
//         for (let [name, svg] of Object.entries(names)) {
//             svg = svg.replace(/<svg /, `<svg id="${name}" `);
//             content += `${svg}\n\n`;
//         }
//         content += '\n\n</defs></svg>';
//         console.log(content);
//     }
// },199)

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
