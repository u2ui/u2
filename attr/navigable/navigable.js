import {TargetObserver} from './TargetObserver.js';
import {U2TargetObserver, toggleParam} from './U2TargetObserver.js';


// translate hash-links to "u2-navigable"-elements into "u2-target"-params
new TargetObserver({
	on: (el) => {
		toggleParam(el.id, true, true);
		const url = new URL(location);
		url.hash = '';
		history.replaceState(null, '', url.href);
	},
	matches: '[u2-navigable]'
})


/* dialog element */
// TODO: there is no open-event, so we can not change the url if its opened by .showModal() mybe "invoke-event" some day?
new U2TargetObserver({
    on:  el => !el.open && el.showModal(),
    off: el => el.close(),
    matches: 'dialog[u2-navigable]',
});
addEventListener('close',e=>{
	const el = e.target;
	if (!el.matches('dialog[u2-navigable]')) return;
	toggleParam(el.id, false);
},true);


/* details */
new U2TargetObserver({
	on:  el => el.open = true,
	off: el => el.open = false,
	matches: 'details[u2-navigable]',
});
addEventListener('toggle',e=>{
	const el = e.target;
	if (!el.matches('details[u2-navigable][id]')) return;
	if (el.open) toggleParam(el.id, true);
	else toggleParam(el.id, false);
},true);


/* checkbox and radio */
new U2TargetObserver({
	on:  el => el.checked = true,
	off: el => el.checked = false,
	matches: 'input:is([type=checkbox],[type=radio])[u2-navigable]',
});
addEventListener('change',e=>{
	const el = e.target;
	if (!el.matches('input:is([type=checkbox],[type=radio])[u2-navigable][id]')) return;

	if (el.type === 'radio') {
		const elements = el.form ? el.form.elements[el.name] : document.getElementsByName(el.name);
		elements.forEach(e => toggleParam(e.id, false)); // toggleParam(e.id, false, TRUE) does not work as expected, why?
	}

	if (el.checked) toggleParam(el.id, true);
	else toggleParam(el.id, false);
});


/* popover */
new U2TargetObserver({
    on: el => el.showPopover(),
    off: el => el.hidePopover(),
    matches: '[popover][u2-navigable]',
});
addEventListener('toggle', e => {
    const el = e.target;
    if (!el.matches('[popover][u2-navigable][id]')) return;
	const newState = e.newState;
	toggleParam(el.id, newState === 'open');
}, true);



// beta
// u2 unified api
addEventListener('u2-activate', e => {
    if (!e.target.hasAttribute('u2-navigable')) return;
	if (!e.target.hasAttribute('id')) { console.warn('element with a u2-navigable attribute must have an id'); return; }
	//e.preventDefault(); // needed?
	location.href = '#' + e.target.id;
});
