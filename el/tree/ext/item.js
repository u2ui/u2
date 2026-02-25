/**
 * Item.js integration for u2-tree
 * This module is loaded on-demand when tree.itemjs is set
 */
export async function applyItemjs(treeElement, item) {
    if (!item) return;
    // Set label
    treeElement.textContent = item.key || '';
    //await item.loadItems();
    syncTreeItem(treeElement, item);
    item.addEventListener('changeIn', ({detail}) => {
        if (detail.add || detail.remove) syncTreeItem(treeElement, item);
    });
}

function createTreeItem(item) {
    const treeItem = document.createElement('u2-tree');
    treeItem.dataset.key = item.key || '';
    treeItem.textContent = item.key || '';
    return treeItem;
}

function syncTreeItem(treeElement, item) {
    const subItems = item.items() ?? [];
    const subItemKeys = new Set(subItems.map(i => i.key));

    // Veraltete entfernen
    [...treeElement.querySelectorAll(':scope > u2-tree')]
        .forEach(child => !subItemKeys.has(child.dataset.key) && child.remove());

    // Neue hinzufügen & alle synken
    subItems.forEach(subItem => {
        const child = treeElement.querySelector(`:scope > u2-tree[data-key="${subItem.key}"]`) ?? treeElement.appendChild(createTreeItem(subItem));
        syncTreeItem(child, subItem);
    });
}