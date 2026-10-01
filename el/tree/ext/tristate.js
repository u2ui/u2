// u2-tree tristate — an item's checkbox stands for everything below it.
// Its checkbox is the first one in its content (not in a child item). Checking it checks every checkbox
// below; it follows its child items': checked when all are, indeterminate when some are. Items added
// later (e.g. loaded on expand) are checked under a checked item; else, as when items are removed,
// the items above follow.
// Loaded on demand via the `tristate` attribute.

const BOX = 'input[type=checkbox]';

/** The item's own checkbox, if it has one: searched in its content only, not below. */
function box(item) {
    for (const el of item.children) {
        if (el.localName === item.localName) continue;
        const found = el.matches(BOX) ? el : el.querySelector(BOX);
        if (found) return found;
    }
}

/** Set every checkbox below the item like its own. */
function cascade(item, checked) {
    for (const b of item.querySelectorAll(BOX)) {
        b.checked = checked;
        b.indeterminate = false;
    }
}

/** The item's checkbox follows its child items'. */
function follow(item) {
    const own = box(item), boxes = [...item.children].filter(c => c.localName === item.localName).map(box).filter(Boolean);
    if (!own || !boxes.length) return;
    const checked = boxes.filter(b => b.checked).length;
    own.checked = checked === boxes.length;
    own.indeterminate = !own.checked && (checked > 0 || boxes.some(b => b.indeterminate));
}

export function tristate(tree) {
    const init = () => {
        const items = [tree, ...tree.querySelectorAll(tree.localName)];
        for (const item of items) { // a checked item: all below it, once (one above did it already)
            if (box(item)?.checked && (item === tree || !box(item.parentNode)?.checked)) cascade(item, true);
        }
        for (const item of items.reverse()) follow(item); // then bottom-up
    };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();

    /** The items from `item` up to the tree follow their children. */
    const up = item => { for (; item !== tree.parentNode; item = item.parentNode) follow(item); };

    tree.addEventListener('input', e => {
        const item = e.target.closest(tree.localName);
        if (!item || e.target !== box(item)) return;
        cascade(item, e.target.checked);
        if (item !== tree) up(item.parentNode);
    });

    new MutationObserver(records => {
        for (const { target, addedNodes, removedNodes } of records) {
            const items = nodes => [...nodes].some(n => n.localName === tree.localName);
            if (items(addedNodes) && box(target)?.checked) cascade(target, true);
            else if (items(addedNodes) || items(removedNodes)) up(target);
        }
    }).observe(tree, { childList: true, subtree: true });
}
