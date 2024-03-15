// icons from directory
// [u1-ico] {
//     --u1-ico-dir:'https://cdn.jsdelivr.net/npm/teenyicons@0.4.1/outline/x-{icon-name}.svg';
// }

const uIco = class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {

        if (this.firstElementChild) return; // skip if not text-only

        // fetch svg if --ui-ico-directory is set
        let dir = getComputedStyle(this).getPropertyValue('--u1-ico-dir').trim();
        if (dir) {
            if (dir[0]!=='"' && dir[0]!=="'") console.error('the value of --u1-ico-dir must be surrounded by quotes');
            dir = dir.slice(1, -1);
            const inner = this.innerHTML.trim();
            const name = this.getAttribute('icon') || inner;
            this.setAttribute('icon',name);
            const path = dirTemplateToUrl(dir, name);
            this.setAttribute('state','loading');
//return;
            loadSvgString(path).then(svg=>{
                // if (path.origin !== location.origin) {} todo: sanitize svg
                // requestAnimationFrame??
                this.innerHTML = svg;
                this.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id')); // remove ids
                if (inner) { // if the name was the content of the element, it was intended to be the label
                    this.firstElementChild.setAttribute('aria-label', inner);
                } else {
                    this.firstElementChild.setAttribute('aria-hidden', 'true');
                }
                this.setAttribute('state','loaded');
            }).catch(err=>{
                console.error(err);
                this.setAttribute('state','fail');
            });
            return;
        }

        // at the moment, "loaded" indicates to css, that it uses --u1-ico-dir
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
}

customElements.define('u1-ico', uIco);


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