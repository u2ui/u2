import { sheet } from './utils.js';

const base = new URL('../', import.meta.url).href; // this copy of u2

/** Base class for u2 elements — keeps a subtree on one u2 version.
    A scoped shadow root only resolves tags its own registry knows, and a shadow opened
    without the option silently falls back to the global one. Inheriting it instead means
    nesting composes: whatever version enhanced the root stays the version all the way down. */
export default class U2Element extends HTMLElement {

    attachShadow(options) {
        return super.attachShadow({customElementRegistry: this.customElementRegistry, ...options});
    }

    useEl(name, options)    { return use(this, 'el', name, options); }
    useClass(name, options) { return use(this, 'class', name, options); }
    useAttr(name, options)  { return use(this, 'attr', name, options); }
}

/** Bring what a child needs into this element's shadow. Both start at once — the css is the
    part that shows, it must not wait for a module. Defaults follow the category: an el has
    both, a class is css only, an attr is js only — `u2-skin` is the attr that styles, and it
    stays an attr because it carries a value: useAttr('skin', {css:true}). */
function use(el, category, name, {css = category !== 'attr', js = category !== 'class'} = {}) {
    const path = `${base}${category}/${name}/${name}`;
    const warn = err => console.warn('u2: could not load', category + '/' + name, err);
    // unshift, not push: the element's own styles are adopted after these and have to keep
    // winning ties, no matter when the child's sheet arrives.
    if (css) sheet(path + '.css').then(s => el.shadowRoot.adoptedStyleSheets.unshift(s), warn);
    if (!js) return;
    return import(path + '.js').then(mod => {
        if (category !== 'el') return; // a class has no js, an attr installs itself
        const registry = el.customElementRegistry ?? customElements;
        const tag = 'u2-' + name;
        registry.get(tag) || registry.define(tag, mod.default);
    }, warn);
}
