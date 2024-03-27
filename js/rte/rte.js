
import './fixes.js';
import * as state from './events.js';
//import './behavior.js';
import {$range} from './range.js';

window.Rte = {
	manipulate(fn) {
		setTimeout(function() {
			state.active.focus(); // firefox
			const range = $range(state.range);
			range.select();
			fn && fn();
		}, 80);
	},
};


await import('./ui.js');
await import('./ui.items.js');


