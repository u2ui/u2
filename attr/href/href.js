/* Copyright (c) 2016 Tobias Buschor https://goo.gl/gl0mbf | MIT License https://goo.gl/HgajeK */

document.addEventListener('click', e => {
	if (e.button !== 0) return; // only left-click
	if (e.defaultPrevented) return; // not if prevented
	const sel = getSelection();
	if (!sel.isCollapsed) { // only if the selection is collapsed.
		const textSelected = sel.anchorNode.nodeType === 3 || sel.focusNode.nodeType === 3;
		const shadowElSelected = sel.focusNode.nodeType === 11; // svg-use-element, firefox
		if (textSelected && !shadowElSelected) return;
	}
	if (!e.target.closest) return; // some targets have no closest method?
	const A = e.target.closest('[u1-href]');
	if (!A) return;
	if (e.target.closest('a,input,textarea,select,button,label')) return;
	//if (e.target.closest('[onclick]')) return; //
	//if (e.target.closest(c1.href.ignoreSelector)) return;
	if (e.target.isContentEditable) return; // not if contenteditable
	const href = A.getAttribute('u1-href'); // get the url
	if (!href) return;

	const url = new URL(href, location.href); // security check, as its not a standard attribute, puryfiers will probably not remove it
	if (url.protocol === 'javascript:') return;

	let target = A.getAttribute('u1-href-target'); // get the target
	if (e.ctrlKey) target = '_blank'; // better random-string?
	// var event = new CustomEvent('u1-href-navigate', { // trigger custom event with the ability to prevent Navigation
	// 	cancelable: true,
	// 	detail: {
	// 		url: href,
	// 		target: target,
	// 	}
	// });
	// window.dispatchEvent(event);
	// if (event.defaultPrevented) return;
	if (target) {
		window.open(href, target, 'noopener'); //!e.ctrlKey && win.focus(); // not needed in chrome, not working in ff
	} else {
		location.href = href;
	}
});
document.head.insertAdjacentHTML('afterbegin', '<style>:where([u1-href]){cursor:pointer}</style>');
