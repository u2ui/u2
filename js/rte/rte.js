
import './fixes.js';
import * as state from './events.js';
//import './inline-behavior.js';
import {$range} from './range.js';

//alert(1)
window.Rte = {
	manipulate(fn) {
		setTimeout(function() {
			state.active.focus(); // firefox
			const range = $range(state.range);
			//range.splitBoundaries();
			range.select();
			fn && fn();
		}, 80);
	},
};


await import('./ui.js');
await import('./ui.items.js');


