import * as dnd from '../../js/drag/drag.js';

function eventDropzone(e) {
    for (const node of e.composedPath()) {
        if (node.matches?.('[u2-dropzone]')) return node;
    }
    return null;
}

let currentStrategy = null;
let currentDropzone = null;
let currentBefore = null;

const dropzoneHandler = {
    dragstart: () => {
        if (!dnd.dragged) return; // just handle elements for now
        document.querySelectorAll('[u2-dropzone]').forEach(zone => {
            const valid = canDrop(zone, dnd.dragged);
            zone.classList.toggle(':drop-invalid', !valid);
            zone.classList.toggle(':drop-valid', valid);
        });
        
        // NEW: prepare the strategy (create placeholder/clone)
        const firstValidZone = document.querySelector('[u2-dropzone].\\:drop-valid');
        currentStrategy = getStrategy(firstValidZone);
    },
    
    dragend: (e) => {
        // NEW: call cancel if not dropped (ESC or invalid drop)
        if (e.dataTransfer.dropEffect === 'none') currentStrategy?.cancel?.();
        
        document.querySelectorAll('[u2-dropzone]').forEach(zone => zone.classList.remove(':drop-invalid', ':drop-valid', ':dragover'));
        
        // NEW: reset strategy
        //currentStrategy = null; // No! still needed for the effect
    },
    
    dragover: (e) => {
        const dropzone = eventDropzone(e);
        if (!dropzone || !dnd.dragged) return;
        dropzone.classList.add(':dragover');
        if (!canDrop(dropzone, dnd.dragged)) return;

        const before = getElementBefore(dropzone, e);

        if (currentDropzone !== dropzone || currentBefore !== before) {
            // NEW: use the strategy of this zone
            const strategy = getStrategy(dropzone);
            // NEW: if the strategy changes, clean up the old one & prepare the new one
            if (currentStrategy && currentStrategy !== strategy) {
                currentStrategy.cancel?.();
                strategy.prepare?.(dnd.dragged);
                currentStrategy = strategy;
            }
            // NEW: call the strategy's move() instead of indicateDrop() directly
            strategy.move(dropzone, 'before', before);
        }
        currentBefore = before;
        currentDropzone = dropzone;
        
        // OLD: indicateDrop(dropzone, 'before', before);

        e.preventDefault();
    },
    
    dragleave: (e) => {
        const dropzone = eventDropzone(e);
        if (!dropzone) return;
        if (!dropzone.contains(e.relatedTarget)) {
            dropzone.classList.remove(':dragover');
            
            // NEW: only clean up once we left ALL dropzones
            const stillInAnyZone = document.querySelector('[u2-dropzone].\\:dragover');
            if (!stillInAnyZone) currentStrategy?.cancel?.();
            
            // OLD: indicateDrop(null);
        }
    },
    
    drop: (e) => {
        e.preventDefault();
        const dropzone = eventDropzone(e);
        if (!dropzone || !dnd.dragged) return;
        if (!canDrop(dropzone, dnd.dragged)) return;
        const before = getElementBefore(dropzone, e);

        const missingDropzone = dnd.dragged.closest('[u2-dropzone]');
        if (missingDropzone) {
            missingDropzone.dispatchEvent(new CustomEvent('u2-dropzone-drop', {
                detail: { remove: dnd.dragged },
                bubbles: true
            }));
        }
        // NEW: performDrop differs per strategy
        const performDrop = () => {
            // with 'move' and 'ghost' the element is already in place
            // with 'indicate' it has to be moved only now
            if (currentStrategy !== strategies.move && currentStrategy !== strategies.ghost) {
                dropzone.insertBefore(dnd.dragged, before);
            }
            
            // NEW: finalize the strategy (clean up placeholder/clone)
            currentStrategy?.finalize?.();
            dropzone.dispatchEvent(new CustomEvent('u2-dropzone-drop', {
                detail: { add: dnd.dragged },
                bubbles: true
            }));
        };
        
        // OLD: const performDrop = () => dropzone.insertBefore(dnd.dragged, before);

        startViewTransition(performDrop);

        // OLD: indicateDrop(null);
        
        // NEW: reset strategy
        //currentStrategy = null;
    }
};

Object.entries(dropzoneHandler).forEach(([type, handler]) => document.addEventListener(type, handler));



function getStrategy(el) {
    if (!el) return strategies.indicate;
    const style = getComputedStyle(el);
    const strategyName = style.getPropertyValue('--u2-dropzone-strategy').trim() || 'indicate';
    return strategies[strategyName] || strategies.indicate;
}
export const strategies = {
    indicate: {
        prepare() {},
        move(zone, position, element) {
            indicateDrop(zone, position, element);
        },
        finalize() {
            indicateDrop(null);
        },
        cancel() {
            indicateDrop(null);
        }
    },
    move: {
        originalParent: null,
        originalNext: null,
        
        prepare(dragging) {
            // remember the origin for cancel
            this.originalParent = dragging.parentNode;
            this.originalNext = dragging.nextElementSibling;
        },
        move(zone, position, element) {
            if (!dnd.dragged) return;
            const perform = ()=>{
                const before = position === 'before' ? element : element?.nextElementSibling;
                zone.insertBefore(dnd.dragged, before);
            }
            startViewTransition(perform);
        },
        finalize() {
            // Cleanup references
            this.originalParent = null;
            this.originalNext = null;
        },
        cancel() {
            // back to the origin
            if (this.originalParent && dnd.dragged) {
                this.originalParent.insertBefore(dnd.dragged, this.originalNext);
            }
            this.originalParent = null;
            this.originalNext = null;
        }
    },
    ghost: {
        clone: null,
        prepare(dragging) {
            this.clone = dragging.cloneNode(true); // ghost/preview while dragging
            this.clone.classList.add('drag-clone');
            this.clone.style.opacity = '0.5';
            dragging.parentNode.insertBefore(this.clone, dragging);
            return this.clone;
        },
        move(zone, position, element) {
            if (!this.clone) return;
            const before = position === 'before' ? element : element?.nextElementSibling;
            zone.insertBefore(this.clone, before);
        },
        finalize() {
            if (this.clone && dnd.dragged) { // the clone becomes the real element
                this.clone.parentNode.insertBefore(dnd.dragged, this.clone);
            }
            this.clone?.remove();
            this.clone = null;
        },
        cancel() {
            this.clone?.remove(); // just remove the clone
            this.clone = null;
        }
    },
};


function startViewTransition(fn){
    if (!document.startViewTransition) return fn();
    // If the transition is skipped (e.g. because another one starts), .ready rejects –
    // the update callback (fn) runs anyway. Catch the rejection, else it is unhandled in the console.
    document.startViewTransition(fn).ready.catch(() => {});
}



function getElementBefore(container, e) {
    const children = [...container.children].filter(child => child !== dnd.dragged);

    if (children.length === 0) return null;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // detect the layout direction
    const layout = detectLayout(container, children);

    // all elements with position and distance
    const elements = children.map(child => {
        const box = child.getBoundingClientRect();
        return {
            element: child,
            box,
            centerX: box.left + box.width / 2,
            centerY: box.top + box.height / 2
        };
    });

    // sort by visual position
    elements.sort((a, b) => {
        if (layout === 'vertical') return a.centerY - b.centerY;
        if (layout === 'horizontal') return a.centerX - b.centerX;
        // grid/flex with wrapping: Y first, then X
        const yDiff = Math.abs(a.centerY - b.centerY);
        return yDiff > 10 ? a.centerY - b.centerY : a.centerX - b.centerX;
    });

    // find the first element AFTER the mouse
    for (const item of elements) {
        const isAfter = layout === 'vertical'
            ? item.centerY > mouseY
            : layout === 'horizontal'
                ? item.centerX > mouseX
                : isAfterInGrid(item, mouseX, mouseY);

        if (isAfter) return item.element;
    }

    return null; // insert at the end
}

function detectLayout(container, children) {
    if (children.length < 2) return 'vertical';

    const styles = getComputedStyle(container);
    const display = styles.display;

    // Flex
    if (display === 'flex' || display === 'inline-flex') {
        const direction = styles.flexDirection;
        if (direction === 'row' || direction === 'row-reverse') {
            return styles.flexWrap === 'nowrap' ? 'horizontal' : 'grid';
        }
        return 'vertical';
    }

    // Grid
    if (display === 'grid' || display === 'inline-grid') {
        const columns = styles.gridTemplateColumns.split(' ').length;
        return columns > 1 ? 'grid' : 'vertical';
    }

    // heuristic: compare the first two elements
    const first = children[0].getBoundingClientRect();
    const second = children[1].getBoundingClientRect();

    // same row = horizontal
    if (Math.abs(first.top - second.top) < 10) return 'horizontal';

    // same column = vertical
    if (Math.abs(first.left - second.left) < 10) return 'vertical';

    // Wrapping Grid/Flex
    return 'grid';
}
function isAfterInGrid(item, mouseX, mouseY) {
    const { box, centerX, centerY } = item;

    // element is in a later row
    if (centerY > mouseY + box.height / 4) return true;

    // same row, but right of the mouse
    const sameLine = Math.abs(centerY - mouseY) < box.height / 2;
    return sameLine && centerX > mouseX;
}



// === Helper Function ===
function canDrop(dropzone, dragged) {
    let selector = dropzone.getAttribute('u2-dropzone').trim();
    if (selector === '*') return true;
    selector ||= ':scope > *'; // just own
    dropzone.id ||= 'u2-dropzone-tmp';
    selector = selector.replaceAll(':scope', '#' + dropzone.id);
    let valid = false;
    try {
        valid = dragged.matches(selector);
    } catch (e) {
        console.error(e);
    }
    dropzone.id === 'u2-dropzone-tmp' && dropzone.removeAttribute('id');
    return valid;
}


function indicateDrop(container, position, element = null) {
    let indicator = document.getElementById('drop-indicator');
    // hide
    if (!container) return indicator?.hidePopover();

    if (!element) { // no reference element: drop appends to the container
        element = container.lastElementChild;
        position = 'after';
    }

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'drop-indicator';
        indicator.popover = 'manual';
        indicator.innerHTML = `
            <style>
            #drop-indicator {
                position: fixed;
                margin: 0;
                padding: 0;
                border: none;
                background: #2563eb;
                pointer-events: none;
                overflow: visible;
                transition: all .07s ease-out;
                z-index: 9999;
                &::before, &::after {
                    content: "";
                    width: 9px;
                    height: 9px;
                    border-radius: 50%;
                    background: inherit;
                    position: absolute;
                }
            }
            #drop-indicator.horizontal {
                width: 2px;
                &::before, &::after { left: -4px; }
                &::before { top: -5px; }
                &::after { bottom: -5px; }
            }
            #drop-indicator.vertical {
                height: 2px;
                &::before, &::after { top: -4px; }
                &::before { left: -5px; }
                &::after { right: -5px; }
            }
            </style>
        `;
        document.body.appendChild(indicator);
    }

    const s = indicator.style;

    // empty container
    if (!element) {
        const rect = container.getBoundingClientRect();
        const styles = getComputedStyle(container);
        const paddingTop = parseFloat(styles.paddingTop);
        const paddingLeft = parseFloat(styles.paddingLeft);

        indicator.className = 'vertical';
        s.top = `${rect.top + paddingTop}px`;
        s.left = `${rect.left + paddingLeft}px`;
        s.width = `${rect.width - paddingLeft - parseFloat(styles.paddingRight)}px`;
        indicator.showPopover();
        return;
    }

    // detect the orientation
    const sibling = position === 'before'
        ? element.previousElementSibling
        : element.nextElementSibling;
    const rect = element.getBoundingClientRect();
    const siblingRect = sibling?.getBoundingClientRect();
    const isHorizontal = siblingRect && Math.abs(rect.top - siblingRect.top) < (rect.height + siblingRect.height) / 4;

    if (isHorizontal) {
        // VERTICAL indicator (between horizontally arranged elements)
        indicator.className = 'horizontal';

        let left;
        if (siblingRect) {
            left = position === 'before'
                ? (siblingRect.right + rect.left) / 2 // between previousSibling and element
                : (rect.right + siblingRect.left) / 2; // between element and nextSibling
        } else { // no neighbour: at the edge with margin
            const styles = getComputedStyle(element);
            const margin = parseFloat(position === 'before' ? styles.marginLeft : styles.marginRight);
            left = position === 'before' ? rect.left - margin / 2 : rect.right + margin / 2;
        }

        s.left = `${left - 1}px`;
        s.top = `${rect.top}px`;
        s.height = `${rect.height}px`;
        s.width = '2px';

    } else {
        // HORIZONTAL indicator (between vertically arranged elements)
        indicator.className = 'vertical';

        let top;
        if (siblingRect) {
            top = position === 'before'
                ? (siblingRect.bottom + rect.top) / 2 // between previousSibling and element
                : (rect.bottom + siblingRect.top) / 2; // between element and nextSibling
        } else {
            // no neighbour: at the edge with margin
            const styles = getComputedStyle(element);
            const margin = parseFloat(position === 'before' ? styles.marginTop : styles.marginBottom);
            top = position === 'before' ? rect.top - margin / 2 : rect.bottom + margin / 2;
        }

        s.top = `${top - 1}px`;
        s.left = `${rect.left}px`;
        s.width = `${rect.width}px`;
        s.height = '2px';
    }

    indicator.showPopover();
}
