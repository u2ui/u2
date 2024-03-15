// checks for hashchange and element matches

const observers = new Set();

export class TargetObserver {

    /**
     * @param {Object} opts
     * @param {Function} opts.on - called when a element is the target
     * @param {Function} opts.off - called when a element lost the target
     * @param {Function} opts.in - called when a element or a descendant is the target
     * @param {Function} opts.out - called when a element lost the target including descendants
     * @param {String} opts.matches - CSS selector for elements we listen to
     */
    constructor(opts) {
        this.opts = opts;
        observers.add(this);
        this.parentTargets = new Set();
        this._testOn(active);
    }

    /**
     * @description stops listening
     */
    disconnect() {
        observers.delete(this);
    }

    /**
     * @param {Element} el
     * @private
     */
    _matches(el){
        if (!el) return false;
        return this.opts.matches==null || el.matches(this.opts.matches);
    }

    /**
     * @param {Element} el
     * @private
     */
    _testOn(el){
        this.opts.on && this._matches(el) && this.opts.on(el);
        if (this.opts.in && el) { // todo: && this.opts.matches ??
            let closest = el.closest(this.opts.matches);
            while (closest) {
                this.opts.in(closest);
                this.parentTargets.add(closest);
                closest = closest.parentNode.closest(this.opts.matches);
            }
        }
        for (const pTarget of this.parentTargets) {
            if (el && pTarget.contains(el)) continue;
            this.opts?.out(pTarget);
            this.parentTargets.delete(pTarget);
        }
    }

    /**
     * @param {Element} el
     * @private
     */
    _testOff(el){
        this.opts.off && this._matches(el) && this.opts.off(el);
        this.opts.out && this._matches(el) && this.opts.out(el);
    }
}

let active = null;

function checkTarget(e) {
    const target = location.hash ? document.getElementById(location.hash.substring(1)) : false;
    const changed = e ? e.oldURL !== e.newURL : target !== active; // test url vs old-url because it can have lost a trigger when changed using replaceState
    if (!changed) return;
    for (const observer of observers) {
        observer._testOff(active);
        observer._testOn(target);
    }
    active = target;
}
checkTarget();
addEventListener('hashchange', checkTarget);


// Usage:
// const observer = new TargetObserver({
//     in: (target) => console.log(target),
//     out: (target) => console.log(target),
//     matches: '.element', // optional
// })
// observer.disconnect();
