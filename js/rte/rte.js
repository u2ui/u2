
import './fixes.js';
import './behavior.js';
import * as state from './events.js';
import {$range} from './range.js';

window.Rte = {
	manipulate(fn) {
		setTimeout(()=>{
			state.active.focus(); // firefox
			$range(state.range).select();
			fn && fn();
		}, 80);
	},
};


await import('./ui.js');
await import('./ui.items.js');


