const observers = new Set();

// global mutation observer
const muObserver = new MutationObserver(checkMutations);
muObserver.observe(document, {
    childList: true,
    subtree: true,
    attributes: true
});
function addTree(el) {
    for (const observer of observers) observer._addTree(el);
}
function removeTree(el) {
    for (const observer of observers) observer._removeTree(el);
}
function treeModified(el) {
    for (const observer of observers) observer._treeModified(el);
}
function checkMutations(mutations) {
    for (const mutation of mutations) {
        if (mutation.type==='childList') {
            for (const target of mutation.addedNodes) {
                target.nodeType === 1 && addTree(target);
            }
            for (const target of mutation.removedNodes) {
                target.nodeType === 1 && removeTree(target);
            }
        }
        if (mutation.type==='attributes') {
            treeModified(mutation.target);
        }
    }
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
        this.animationName = `u1-selObs-${animationCounter++}`;

        this.style.innerHTML =
            `@keyframes ${this.animationName}{}\n`+
            `${selector}{animation:${this.animationName} .1ms}`+
            `.u1sOTracked:not(${selector}){animation:${this.animationName} .1ms .1ms}`+
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
            e.target.classList.add('u1sOTracked'); // can be removed if none of the listeners tracking it
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
     */
    observe(selector, options={}) {
        this.selector = selector;
        this.options = options;
        const els = document.querySelectorAll(this.selector);
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
        if (document.readyState === 'complete') { // Before domready MutationObserver reports every node, ok?
            for (const el of target.querySelectorAll(this.selector)) this._add(el);
        }
    }

    /**
     * @private
     */
     _removeTree(target) {
        //if (!this._off) return; // performance
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

            for (const el of target.querySelectorAll('*')) { // expected to be expensiv
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