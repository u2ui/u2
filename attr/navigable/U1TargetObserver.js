// checks for the "u1-target" query parameter and calls the on/off functions
// e.g. ?u1-target=details1+checkbox3+dialog1

const observers = new Set();

export class U1TargetObserver {
	constructor(opts) {
		this.opts = opts;
		observers.add(this);

        this._testOns(actives);
	}
	disconnect() {
		observers.delete(this);
	}
    _matches(el){
        if (!el) return false;
        return el!==false && this.opts.matches==null || el.matches(this.opts.matches);
    }
    _testOn(el){
        this.opts.on && this._matches(el) && this.opts.on(el);
    }
    _testOff(el){
        this.opts.off && this._matches(el) && this.opts.off(el);
    }
    _testOns(els){
        for (const el of els) this._testOn(el);
    }
    _testOffs(els){
        for (const el of els) this._testOff(el);
    }
}

let actives = new Set();

function checkTargets(){
	const newest = new Set();
	const param = new URL(location).searchParams.get('u1-target');
	if (param) {
        for (const item of param.split(' ')) {
            const el = item && document.getElementById(item);
            el && newest.add(el);
        }
    }

	const added = new Set();
	const removed = new Set();
	for (let item of actives) if (!newest.has(item)) removed.add(item);
	for (let item of newest)  if (!actives.has(item)) added.add(item);
    for (const obs of observers) {
        obs._testOffs(removed);
        obs._testOns(added);
    }
	actives = newest;
}
addEventListener('popstate', checkTargets);
checkTargets();


// Possible improvement:
// Initial TargetObserver tiggers if in url, then toggle-event triggers, resulting in toggleParam without a need.
// Can we solve this?

// togglelParam
export function toggleParam(id, force, replace){
	const url = new URL(location);
	const targets = new Set((url.searchParams.get('u1-target')||'').split(' '));
    const isPresent = targets.has(id);
    const shouldAdd = force ?? !isPresent;
    if (shouldAdd === isPresent) return;
    shouldAdd ? targets.add(id) : targets.delete(id);
    url.searchParams.set('u1-target', [...targets].join(' '));
    history[replace?'replaceState':'pushState'](null, '', url.href);
    checkTargets();
}
