const observers = new Set();

// one mutation observer per root (document or a ShadowRoot)
const roots = new Map();
function observeRoot(root) {
    if (roots.has(root)) return;
    const mo = new MutationObserver(m => checkMutations(m, root));
    mo.observe(root, { childList: true, subtree: true, attributes: true });
    roots.set(root, mo);
}
function forRoot(root, method, el) {
    for (const observer of observers) observer.root === root && observer[method](el);
}
function checkMutations(mutations, root) {
    const added = new Set(), removed = new Set(), modified = new Set();
    for (const m of mutations) {
        if (m.type === 'attributes') { modified.add(m.target); continue; }
        for (const n of m.removedNodes) n.nodeType === 1 && removed.add(n);
        for (const n of m.addedNodes) n.nodeType === 1 && added.add(n);
    }
    // a node inside another node of the same batch is covered by that node's subtree
    const top = (n, set) => { for (let p = n.parentNode; p; p = p.parentNode) if (set.has(p)) return false; return true; };
    for (const n of removed) top(n, removed) && forRoot(root, '_removeTree', n);
    // judged by the final state: a node that left again, or was only touched while detached, is not added
    for (const n of added) top(n, added) && root.contains(n) && forRoot(root, '_addTree', n);
    for (const n of modified) root.contains(n) && forRoot(root, '_treeModified', n);
}


// animation observer (beta), todo:refine and performance tests, problem: can not set multiple animation per selector => can be overwritten
/*
let animationCounter = 0;
let aObservers = new Set();
class _animationObserver {
    constructor(selector, on) {
        this.on = on;
        // todo?: reuse style element if selector already exists
        // or better: use same style element for all selectors?
        // this way we dont overwrite elements targeting by multiple observers,
        // but we have to match the selector for every observer
        this.style = document.createElement('style');
        this.animationName = `u2-selObs-${animationCounter++}`;

        this.style.innerHTML =
            `@keyframes ${this.animationName}{}\n`+
            `${selector}{animation:${this.animationName} .1ms}`+
            `.u2sOTracked:not(${selector}){animation:${this.animationName} .1ms .1ms}`+
            ``; // todo: :where() when supported
        document.head.append(this.style);
        aObservers.add(this);
    }
    disconnect(){
        this.style.remove();
        aObservers.delete(this);
    }
}
document.addEventListener('animationstart', e => { // todo: remove/add listener by usage
    for (const observer of aObservers) {
        if (e.animationName === observer.animationName) {
            observer.on(e.target);
            e.target.classList.add('u2sOTracked'); // can be removed if none of the listeners tracking it
        }
    }
});
*/





export class SelectorObserver {

    /**
     * @param {Object} options
     * @param {Function} options.on
     * @param {Function} options.off
     */
    constructor({on, off}) {
        this.targets = new Set(); // was WeakSet, but we clean targets anyway. Better WeakRef-Set? // rename to targets?
        this._on = on;
        this._off = off;
    }

    /**
     * @param {String} selector
     * @param {Object} [options]
     * @param {Document|ShadowRoot} [options.root=document] - scope to observe (e.g. a shadow root)
     */
    observe(selector, options={}) {
        this.selector = selector;
        this.options = options;
        const root = this.root = options.root ?? document;
        observeRoot(root);
        const els = root.querySelectorAll(this.selector);
        for (const el of els) this._add(el);

        //if (options.checkMutations!==false) {
            observers.add(this);
        //}
        /*
        if (options && options.checkAnimation) {
            this.aniObserver = new _animationObserver(this.selector, el=>{
                el.matches(this.selector) ? this._add(el) : this._remove(el);
            });
        }
        */
    }


    /**
     * @description disconnects the observer
     */
    disconnect() {
        this.targets.clear();
        observers.delete(this);
        //this.aniObserver && this.aniObserver.disconnect();
    }

    /**
     * @private
     */
    _add(el) {
        if (this.targets.has(el)) return;
        this.targets.add(el);
        this._on && this._on(el);
    }

    /**
     * @private
     */
     _remove(el) {
        if (!this.targets.has(el)) return;
        this.targets.delete(el);
        this._off && this._off(el);
    }

    /**
     * @private
     */
     _addTree(target) {
        target.matches(this.selector) && this._add(target);
        // a scripted insert is reported as its root only, even while parsing; nodes found twice are deduped by targets
        for (const el of target.querySelectorAll(this.selector)) this._add(el);
    }

    /**
     * @private
     */
     _removeTree(target) {
        if (!this.targets.size) return;
        this._remove(target);
        for (const el of target.querySelectorAll('*')) this._remove(el);
    }

    /**
     * @private
     */
     _treeModified(target) {
        target.matches(this.selector) ? this._add(target) : this._remove(target);
        // for the moment subtree not checked
        if (this.options.deep) {

            for (const el of target.querySelectorAll('*')) { // expected to be expensiv (why not target.querySelectorAll(this.selector)?)
                el.matches(this.selector) ? this._add(el) : this._remove(el);
            }
            //for (const el of this.targets) if (!el.matches(this.selector)) this._remove(el); // not iterable, use WeekRef if supported
            //for (const el of target.querySelectorAll(this.selector)) this._add(el);
        }
    }
}


/* nice shorthands, todo:test *

export function observe(selector, on, off) {
    const observer = new SelectorObserver({on, off})
    observer.observe(selector);
    return observer;
}

export function on(selector, fn){
    const observer = new SelectorObserver({on:fn});
    observer.observe(selector);
}

export function off(selector, fn){
    const observer = new SelectorObserver({off:fn});
    observer.observe(selector);
}

export function one(selector, fn){
    const observer = new SelectorObserver({on:el=>{
        observer.disconnect();
        fn(el);
    }});
    observer.observe(selector);
}
/* */