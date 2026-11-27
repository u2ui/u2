
addEventListener('keydown', e => {
	if (e.defaultPrevented) return;
    if (e.altKey) return; // alt is reserved for browser back/forward
    if (e.ctrlKey || e.metaKey || e.shiftKey) return; // we only want to handle arrow keys without modifiers, in the future we could add a setting for this (focus last element with arrow left + shift)

	const isVertical = e.code === 'ArrowUp' || e.code === 'ArrowDown';
	const isHorizontal = e.code === 'ArrowLeft' || e.code === 'ArrowRight';
	if (!isVertical && !isHorizontal) return;

	const {target, container} = eventTargets(e);
	if (!container) return;

	// keys the field itself needs
	if (target.tagName === 'TEXTAREA') return;
	if (isHorizontal && target.tagName === 'INPUT' && target.type !== 'checkbox' && target.type !== 'radio') return;
	if (isVertical && target.tagName === 'SELECT') return;

	const options = Object.fromEntries(container.getAttribute('u2-focusgroup').split(' ').map(o => [o, true]));
	if ((options.horizontal || options.vertical) && !options[isHorizontal ? 'horizontal' : 'vertical']) return; // neither: both

	const direction = e.code === 'ArrowLeft' || e.code === 'ArrowUp' ? -1 : 1;

	const items = groupItems(container);
	if (items.length < 2) return;

	const index = items.indexOf(target);

	if (index === -1) {
		console.warn('should not happen, got a focusgroup-key-event, but the target is not focusable!');
		return;
	}

	// wrapping: past the last to the first, before the first (-1) to the last
	const next = options.wrap ? items.at((index + direction) % items.length) : items[index + direction];
	if (!next) return;

	next.focus();

    // remember
    if (options.remember) {
        items.forEach(el => el.setAttribute('tabindex', el === next ? '0' : '-1'));
    }

	e.preventDefault();
});


// addEventListener('focusin', e => {
// 	const {target, container} = eventTargets(e);
// 	if (!container) return;
// 	const remember = container.getAttribute('u2-focusgroup').split(' ').includes('remember');
// 	if (!remember) return;
// 	groupItems(container).forEach(el => el.setAttribute('tabindex', el === target ? '0' : '-1'));
// });



function groupItems(container) {
	const selector = 'a[href], button, input, select, textarea, [contenteditable], [tabindex]';
	// an element belongs to its closest group only: a nested group is a group of its own, as with the native focusgroup
	const elements = [...container.querySelectorAll(selector)].filter(el => el.closest('[u2-focusgroup]') === container);

	// handle slotted elements, beta
	const slots = container.matches('slot') ? [container] : container.querySelectorAll('slot'); // TODO: handle slotted elements
	for (const slot of slots) elements.push(...slot.assignedElements({flatten: true}).filter(el => el.matches(selector)));

	return elements.filter(el => !el.disabled);
}

function eventTargets(event){
	let target = event.target;
	let container = target.closest('[u2-focusgroup]');
	if (!container) { // inside shadow dom
		target = event.originalTarget; // only for firefox?
		if (!target) return {};
		container = target.closest('[u2-focusgroup]');
	}
	container ||= target.assignedSlot?.closest('[u2-focusgroup]'); // if slotted, ok?
	return {target, container};
}
