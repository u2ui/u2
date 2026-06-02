/**
 * Item.js integration for u2-tree
 * This module is loaded on-demand when tree.itemjs is set
 */
export async function applyItemjs(treeElement, item, { render = null } = {}) {
    if (!item) return;
    treeElement.textContent = item.key || '';
    syncTreeItem(treeElement, item, render);
    item.addEventListener('changeIn', ({add, remove}) => {
        if (add || remove) syncTreeItem(treeElement, item, render);
    });
}

function createTreeItem(item, render) {
    const treeItem = document.createElement('u2-tree');
    treeItem.dataset.key = item.key || '';
    treeItem.textContent = item.key || '';
    render?.(treeItem, item);
    return treeItem;
}

function syncTreeItem(treeElement, item, render) {
    const subItems = item.items() ?? [];
    const subItemKeys = new Set(subItems.map(i => i.key));

    // remove stale children
    [...treeElement.querySelectorAll(':scope > u2-tree')]
        .forEach(child => !subItemKeys.has(child.dataset.key) && child.remove());

    // add new & sync all
    subItems.forEach(subItem => {
        const child = treeElement.querySelector(`:scope > u2-tree[data-key="${subItem.key}"]`) ?? treeElement.appendChild(createTreeItem(subItem, render));
        syncTreeItem(child, subItem, render);
    });
}