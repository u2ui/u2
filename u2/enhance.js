/* Run u2 inside one root: watch it, load what its markup needs and put it there — elements
in that root's own registry, css as adopted sheets. Unlike ./auto.js this touches nothing
outside the root: no global stylesheets, no window.customElements, no localStorage, no ui.

In a shadow root the css is an adopted sheet, parsed once and shared by every other root;
fetching it needs the same connect-src as ./u2.js already does for projects.json. In the
document it stays a <link>, so the page keeps its say over u2's own rules.

See ./plan-scoped-refactoring.md */

import { repos } from './u2.js';
import { importCss } from './utils.js';

const base = new URL('../', import.meta.url).href; // this copy of u2 — another root may run another
const scoped = 'customElementRegistry' in ShadowRoot.prototype;
// The default scope: module identity gives one per u2 version, so a caller who does not care
// gets isolation for free. A caller who brings its own wins, and the elements follow the root.
const versionRegistry = scoped ? new CustomElementRegistry() : undefined;
const sheets = new Map(); // url -> Promise<CSSStyleSheet>, shared across roots

// the manifest is wanted by every load, so fetch it on import and keep the resolved map
let projects = null;
repos().then(map => projects = map);

function sheet(url) {
    if (!sheets.has(url)) {
        sheets.set(url, fetch(url).then(r => r.text()).then(css => {
            const s = new CSSStyleSheet();
            s.replaceSync(css); // u2 css has no relative url() and no @import
            return s;
        }));
    }
    return sheets.get(url);
}

/** Attach a shadow root that runs its own u2. Same signature as the native method. */
export function attachShadow(host, options = {}) {
    const registry = options.customElementRegistry ?? versionRegistry;
    const root = host.attachShadow({ mode: 'open', ...options, customElementRegistry: registry });
    enhance(root);
    return root;
}

/** Watch a root and load the u2 parts its markup uses. Returns a function that stops watching.
  * The registry is the root's own — define anywhere else and the root would not resolve it.
  * `onLoad(kind, url)` reports every file, for callers that keep a list of what a page needs. */
export function enhance(root, { registry = root.customElementRegistry ?? customElements, onLoad } = {}) {
    const seen = new Set();
    const isShadow = root instanceof ShadowRoot;

    // The repeat case must stay synchronous: a list of 50 identical elements calls this 50
    // times, and only the first may allocate. Nothing awaits it, so run() catches its own.
    function load(category, name) {
        const id = category + '/' + name;
        if (seen.has(id)) return;
        seen.add(id);
        run(id, category, name).catch(err => console.warn('u2: could not load', id, err));
    }

    async function run(id, category, name) {
        const meta = (projects ?? await repos())[id];
        if (!meta) { console.warn('u2: project not found:', id); return; }

        // css belongs in this root: a class or an attribute has no effect without it,
        // and element css styles the element from outside its own shadow
        if (meta.css ?? (category !== 'attr')) {
            const url = `${base}${id}/${name}.css`;
            // A shadow root shares one parsed sheet with every other root. In the document a
            // <link> keeps the cascade as it is — an adopted sheet would outrank the page's
            // own stylesheets and break overrides. (Layers may make this moot one day.)
            if (isShadow) root.adoptedStyleSheets.push(await sheet(url));
            else importCss(url);
            onLoad?.('css', url);
        }
        if (!(meta.js ?? (category !== 'class'))) return;

        const jsUrl = `${base}${id}/${name}.js`;
        const mod = await import(jsUrl);
        onLoad?.('js', jsUrl);
        // attributes register nothing — their listeners sit on the document and cross shadow
        // boundaries on purpose, so they are not scoped by this root
        if (category !== 'el') return;

        const tag = 'u2-' + name;
        // the file still registers itself globally — that is a different registry
        if (!registry.get(tag)) registry.define(tag, mod.default);
        for (const [t, cls] of Object.entries(mod.extraElements ?? {})) {
            if (!registry.get(t)) registry.define(t, cls);
        }
    }

    // Hot path: every element inserted into the root passes through here. Index loops, so
    // neither a DOMTokenList nor a NamedNodeMap iterator is allocated per element.
    function visit(el) {
        const tag = el.tagName;
        if (tag.startsWith('U2-')) load('el', tag.slice(3).toLowerCase());

        const cls = el.className; // string on html elements, SVGAnimatedString on svg
        if (typeof cls === 'string' && cls.includes('u2-')) {
            const list = el.classList;
            for (let i = 0, n = list.length; i < n; i++) {
                const c = list[i];
                if (c.startsWith('u2-')) load('class', c.slice(3));
            }
        }

        const attrs = el.attributes;
        for (let i = 0, n = attrs.length; i < n; i++) {
            const name = attrs[i].name;
            if (name.startsWith('u2-')) load('attr', name.slice(3).replace(/-.*/, ''));
        }
    }

    function scan(node) {
        if (node.nodeType === 1) visit(node); // text and comment nodes carry nothing
        const els = node.querySelectorAll?.('*');
        if (els) for (let i = 0, n = els.length; i < n; i++) visit(els[i]);
    }

    const observer = new MutationObserver(entries => {
        for (let i = 0, n = entries.length; i < n; i++) {
            const added = entries[i].addedNodes;
            for (let j = 0, m = added.length; j < m; j++) scan(added[j]);
        }
    });
    observer.observe(root, { childList: true, subtree: true });
    scan(root);

    return () => observer.disconnect();
}
