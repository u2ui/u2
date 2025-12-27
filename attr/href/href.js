document.addEventListener('click', e => {
	if (e.button !== 0) return; // only left-click
	if (e.defaultPrevented) return; // not if prevented
    if (!e.target.closest) return; // some targets have no closest method?
	const A = e.target.closest('[u2-href]');
	if (!A) return;
	let href = A.getAttribute('u2-href'); // get the url

	if (href === '') {
		const realA = A.querySelector('a[href]');
		if (!realA) return;
		href = realA.href;
	}

	if (e.target.isContentEditable) return;
    if (e.target.closest('a,input,textarea,select,button,label')) return;
	//if (e.target.closest('[onclick]')) return; //
	//if (e.target.closest(c1.href.ignoreSelector)) return;

	const sel = getSelection();
    for (let i = 0; i < sel.rangeCount; i++) {
        if (sel.getRangeAt(i).toString().trim() !== '') return;
    }
	// if (!sel.isCollapsed) { // only if the selection is collapsed. // deprecated
	// 	const textSelected = sel.anchorNode.nodeType === 3 || sel.focusNode.nodeType === 3;
	// 	const shadowElSelected = sel.focusNode.nodeType === 11; // svg-use-element, firefox
	// 	if (textSelected && !shadowElSelected) return;
	// }

	const url = new URL(href, location.href); // security check, as its not a standard attribute, puryfiers will probably not remove it
	if (url.protocol === 'javascript:') return;

	let target = A.getAttribute('u2-href-target'); // get the target
    if (e.ctrlKey || e.metaKey) target = '_blank';
	// var event = new CustomEvent('u2-href-navigate', { // trigger custom event with the ability to prevent Navigation
	// 	cancelable: true,
	// 	detail: {
	// 		url: href,
	// 		target: target,
	// 	}
	// });
	// window.dispatchEvent(event);
	// if (event.defaultPrevented) return;
	if (target) {
		window.open(href, target, 'noopener,noreferrer'); //!e.ctrlKey && win.focus(); // not needed in chrome, not working in ff
	} else {
		location.href = href;
	}
});
document.head.insertAdjacentHTML('afterbegin', '<style>:where([u2-href]){cursor:pointer}</style>');
