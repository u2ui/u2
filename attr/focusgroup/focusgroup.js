
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
	if (isVertical && target.tagName === 'INPUT' && /^(number|range|date|time|datetime-local|month|week)$/.test(target.type)) return; // up/down change its value

	const options = optionsOf(container);
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

	next.focus(); // remembered by focusin

	e.preventDefault();
});

// memory, as with the native focusgroup on unless "nomemory": the item focused last is the group's only tab stop,
// however it got the focus (arrow key, click, script)
addEventListener('focusin', e => {
	const {target, container} = eventTargets(e);
	if (!container || optionsOf(container).nomemory) return;
	const items = groupItems(container);
	if (!items.includes(target)) return; // not one of its items (e.g. one of a nested group): the tab stop stays
	items.forEach(el => el.tabIndex = el === target ? 0 : -1);
});

const optionsOf = container => Object.fromEntries(container.getAttribute('u2-focusgroup').split(' ').map(o => [o, true]));


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
	const target = event.composedPath()[0]; // the real target, also inside an open shadow root (event.target is its host)
	const container = target.closest('[u2-focusgroup]') ?? target.assignedSlot?.closest('[u2-focusgroup]'); // if slotted, ok?
	return {target, container};
}
