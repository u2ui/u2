import { $range } from './range.js';
import * as state from './events.js';

window.Rte = {
	manipulate(fn) {
		setTimeout(()=>{
			state.active.focus(); // firefox
			$range(state.range).select();
			fn && fn();
		}, 80);
	},
    targetToolbarItems(target) {
        const style = getComputedStyle(target);
        const rteItems = style.getPropertyValue('--u2-rte-items');
        if (rteItems) console.warn('--u2-rte-items is deprecated, use --u2-rte-toolbar instead');
        const rteToolbar = style.getPropertyValue('--u2-rte-toolbar');
        let names = (rteToolbar || rteItems).split(/\s+/).filter(name=>name.trim());
        if (!names.length) names = Object.keys(this.items);
        const items = [];
        for (const name of names) {
            if (!this.items[name]) {
                console.warn('Rte toolbar item not found:', name);
                continue;
            }
            items.push(this.items[name]);
        }
        return items;
    },

    items: Object.create(null),
	setItem(name, opt) {
        const icon = opt.icon || 'format-'+name.toLowerCase();
		if (!opt.el) {
			opt.el = document.createElement('button');
			opt.el.className = '-item -'+name;
            const label = opt.labels?.[lang] ?? opt.labels?.['en'] ?? name;
            const shortcut = opt.shortcut ? `(Ctrl+${opt.shortcut})` : '';
            opt.el.innerHTML = `<u2-ico icon="${icon}"></u2-ico><u2-tooltip>${label} ${shortcut}</u2-tooltip>`;
		}
		if (opt.cmd) {
			if (!opt.click && opt.click != false) opt.click = ()=>document.execCommand(opt.cmd, false);
			if (!opt.check && opt.check != false) opt.check = ()=>document.queryCommandState(opt.cmd);
		}
		const enable = opt.enable;
        if (typeof enable === 'string') {
			opt.enable = el => el && el.matches(enable); // closest inside active?
		}
		opt.click && opt.el.addEventListener('click',e=>{
			Rte.manipulate( ()=>opt.click(e) );
		}, false);

        this.items[name] = opt;
		return opt.el;
	},
	setSelect(name, opt) {
        let el = document.createElement('div');
        el.className = '-item -select';
        el.innerHTML = '<button class=-state></button><div class=-options></div>';
        let opts = el.querySelector(':scope>.-options');
		opt.el = el;
		this.setItem(name,opt);
		return opts;
	},

        
};

const lang = document.documentElement.getAttribute('lang') || navigator.language.substring(0,2) || 'en';

export const Rte = window.Rte;