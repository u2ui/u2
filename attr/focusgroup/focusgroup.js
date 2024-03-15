/* Copyright (c) 2016 Tobias Buschor https://goo.gl/gl0mbf | MIT License https://goo.gl/HgajeK */

addEventListener('keydown', e => {
	if (e.defaultPrevented) return;

	const isVertical = (e.code === 'ArrowUp' || e.code === 'ArrowDown');
	const isHorizontal = (e.code === 'ArrowLeft' || e.code === 'ArrowRight');
	if (!isVertical && !isHorizontal) return;

	const {target, container} = eventTargets(e);
	if (!container) return;

	if (isHorizontal) {
		if (target.tagName === 'INPUT' && (target.type !== 'checkbox' && target.type !== 'radio')) return;
		if (target.tagName === 'TEXTAREA') return;
	}
	if (isVertical) {
		if (target.tagName === 'SELECT') return;
		if (target.tagName === 'TEXTAREA') return;
	}

	const tmp = container.getAttribute('u1-focusgroup').split(' ');
	const options = Object.fromEntries(tmp.map(o => [o, true]));
	if (!options.horizontal && !options.vertical) {
		options.horizontal = true;
		options.vertical = true;
	}

	if (!options.horizontal && isHorizontal) return;
	if (!options.vertical && isVertical) return;

	let direction = 0;
	if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') direction = -1;
	if (e.code === 'ArrowRight' || e.code === 'ArrowDown') direction = 1;
	if (direction === 0) return;

	const items = groupItems(container);
	if (items.length < 2) return;

	const index = items.indexOf(target);

	if (index === -1) {
		console.warn('should not happen, got a focusgroup-key-event, but the target is not focusable!');
		return;
	}

	let next = items[index + direction];
	if (!next && options.wrap) next = direction === 1 ? items.at(0) : items.at(-1);
	if (!next) return;

	next.focus();
	e.preventDefault();
});


addEventListener('focusin', e => {
	const {target, container} = eventTargets(e);
	if (!container) return;
	const remember = container.getAttribute('u1-focusgroup').split(' ').includes('remember');
	if (!remember) return;
	groupItems(container).forEach(el => el.setAttribute('tabindex', el === target ? '0' : '-1'));
});



function groupItems(container) {
	const selector = ' :not(u1-focusgroup) a[href], button, input, select, textarea, [contenteditable], [tabindex]';
	const elements = [...container.querySelectorAll(selector)];

	// handle slotted elements, beta
	const slots = container.matches('slot') ? [container] : container.querySelectorAll('slot'); // TODO: handle slotted elements
	slots.forEach(slot => {
		const slotted = slot.assignedElements({flatten: true}).filter(el => el.matches(selector));
		elements.push(...slotted);
	});

	return elements.filter(el => !el.disabled);
}

function eventTargets(event){
	let target = event.target;
	let container = target.closest('[u1-focusgroup]');
	if (!container) { // inside shadow dom
		target = event.originalTarget; // only for firefox?
		if (!target) return {};
		container = target.closest('[u1-focusgroup]');
	}
	if (!container) container = target.assignedSlot?.closest('[u1-focusgroup]'); // if slotted, ok?
	return {
		target,
		container
	};
}
