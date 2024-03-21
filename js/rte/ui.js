/* Copyright (c) 2016 Tobias Buschor https://goo.gl/gl0mbf | MIT License https://goo.gl/HgajeK */

import {$range} from './range.js';
import * as state from './events.js';


import '../../el/tooltip/tooltip.js';

const css = `
@import '../../../el/tooltip/tooltip.css';

[contenteditable]:focus td {
	outline:1px dashed #F4E2DC;
	outline-offset:0px;
}
[contenteditable] td {
	min-width:1em;
}
[contenteditable]:focus table {
	outline:1px dashed #F4E2DC;
	outline-offset:1px;
}


#u2RteToolbar {
    --u2-ico-dir:'https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.11/svg/{icon_name}/baseline.svg';
	position:absolute;
	top:90px;
	left:90px;
	z-index:1999;
	box-shadow: 0 0 10px rgba(0,0,0,.4);
	font-size:14px;
	font-family: system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    background-color:var(--color-text, #222);
    color: var(--color-bg, #fff);
    max-width: min(17rem, 100vw);
    transition:.14s;
    transition-property:top, left, opacity;

    & [hidden] { display:none !important; }

    & u2-ico { --size: 21px }
    
    & > div {
        display:flex;
        flex-flow:wrap;
        justify-content: space-between;
    }
    
    & :is(input, textarea) {
        font-size:inherit;
        background:inherit;
        border:1px solid;
        width:100%;
        padding:3px;
        color:#fff;
    }
    & input[type=checkbox] {
        width:auto;
    }
    & table {
        margin:0;
        flex: 1 1 100%;
        border-collapse:collapse;
        width: 100%;
    }
    
    & td {
        height:39px;
        vertical-align: middle;
        padding:8px 10px;
    }
    & input {
        border:none;
        background:#ccc;
        color:#000;
        margin:0;
        padding:.3em .6em;
    }
    & input:is(:focus, :hover) {
        background:#fff;
    }
    
    & .-item {
        background:transparent;
        border-radius:0;
        border:0;
    }
    & .-item {
        display:flex;
        align-items:center;
        justify-content: center;
        line-height:1.2;
        padding:.6em;
    }
    & .-item:hover {
        background:#fff4;
    }
    & .-item.-select {
        width:8em;
        position:relative;
        padding:.5em .7em;
        flex:1 1 auto;
        padding-right: 1.8em;
        justify-content: start;
    }
    & .-item.-select:after {
        content:'▼';
        position:absolute;
        top:50%;
        right:1em;
        transform:translateY(-50%);
        font-size:.7em;
    }
    & .-item.-button {
        width:auto;
        flex:auto;
    }
    
    & .-state {
        overflow:hidden;
        white-space:nowrap;
    }
    
    & .-options {
        display:none;
        padding:.2em;
        position: absolute;
        left:-1px;
        top:100%;
        white-space:nowrap;
        z-index:1;
        background-color:#fff;
        color:#000;
        overflow:visible;
        box-shadow:0 0 .5rem #0007;
        min-width:100%;
        cursor:pointer;
    }
    & .-options > * {
        padding:.4rem .4rem !important;
        white-space: nowrap;
        display:block !important;
        clear:both !important;
        width:auto !important;
        border-bottom:1px solid #eee;
        margin:0 !important;
    }
    & .-options > .-selected {
        background-color: var(--color, #49F);
        color: #fff;
    }
    
    & .-item.active {
        color: var(--color, #0099ff);
        color: color-mix(in srgb, var(--color, #0099ff), #fff 30%);
    }
}
`;

let style = document.createElement('style');
style.innerHTML = css;
document.head.appendChild(style);

let uiMouseover = 0;

window.Rte.ui = {
	init() {
		const my = this;
		my.div = document.createElement('div');
		my.div.id = 'u2RteToolbar';
        my.div.classList.add('u2RteTool');
        my.div.tabIndex = -1;

		my.mainContainer = document.createElement('div');
		my.mainContainer.className = '-main';
		my.div.appendChild(my.mainContainer);

        addEventListener('u2-rte-activate', function(e) {
            my.mainContainer.innerHTML = '';
            let names = getComputedStyle(e.target).getPropertyValue('--u2-rte-items').split(/\s+/).filter(name=>name.trim());
            if (!names.length) names = Object.keys(my.items);
            for (const name of names) {
                if (!my.items[name]) continue;
                my.mainContainer.appendChild(my.items[name].el);
            }

            document.documentElement.appendChild(my.div);
            my.div.hidden = false;
            e.target.addEventListener('keydown', shortcutListener, false);
		});
        addEventListener('u2-rte-deactivate', function(e) {
            my.div.hidden = true;
            e.target.removeEventListener('keydown', shortcutListener, false);
			// setTimeout(()=>{ // need timeout because inputs inside have to blur first (ff, no chrome)
			// 	!Rte.active && my.div.parentNode && document.documentElement.removeChild(my.div);
            // },1);
		});
        addEventListener('u2-rte-selectionchange', function() {
			for (let item of Object.values(my.items)){
				if (!item.enable || item.enable(Rte.element)) {
					item.enabled = true;
					item.el.removeAttribute('hidden');
					if (item.check) {
						const act = item.check(Rte.element) ? 'add' : 'remove';
						item.el.classList[act]('active');
					}
				} else {
					item.enabled = false;
					item.el.setAttribute('hidden',true);
				}
			}
		});
		const shortcutListener = function(e) {

			if (e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
				const char = e.key;
				for (let item of Object.values(my.items)){
					if (item.enabled && item.shortcut === char) {
                        item.el.click();
		                e.preventDefault();
					}
				}
			}

		};
		my.div.addEventListener('mouseenter',() => {uiMouseover = 1;});
		my.div.addEventListener('mouseleave',() => {uiMouseover = 0;});
	},
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
			if (!opt.click && opt.click != false) opt.click = ()=>{
                document.execCommand(opt.cmd, false);
            };
			if (!opt.check && opt.check != false) opt.check = ()=>document.queryCommandState(opt.cmd);
		}
		const enable = opt.enable;
		if (enable && enable.toLowerCase) {
			opt.enable = el => el && el.matches(enable);
			// opt.enable = el => { // todo?
			// 	if (!el) return false;
			// 	let target = el.closest(enable);
			// 	return Rte.active !== target && Rte.active.contains(target);
			// }
		}
		opt.click && opt.el.addEventListener('click',e=>{
			Rte.manipulate( ()=>opt.click(e) ); // todo: manipulate schon hier??
		}, false);

        this.items[name] = opt;
		return opt.el;
	},
	setSelect(name, opt) {
		let timeout = null;
        let el = document.createElement('div');
        el.className = '-item -select';
        el.innerHTML = '<div class=-state></div><div class=-options></div>';

		el.addEventListener('mousedown', e=> { opts.style.display = 'block'; e.preventDefault(); });
		el.addEventListener('mouseover', e=> clearTimeout(timeout) );
		el.addEventListener('mouseout',  e=> timeout = setTimeout(()=> opts.style.display = 'none' ,300) );
        let opts = el.querySelector(':scope>.-options');
		opt.el = el;
		this.setItem(name,opt);
		return opts;
	},
	items:{}
};

Rte.ui.init();


import('./../Placer/Placer.js').then(({Placer})=>{
    const placer = new Placer(Rte.ui.div, {
        x:'center',
        y:'after',
    });
    addEventListener('u2-rte-selectionchange', async ()=>{
        if (uiMouseover) return;
        placer.options.margin = getSelection().isCollapsed ? 120 : 40;
        placer.toClientRect($range.fromSelection().boundingClientRect());
    });
});

const lang = document.documentElement.getAttribute('lang') || navigator.language.substring(0,2) || 'en';