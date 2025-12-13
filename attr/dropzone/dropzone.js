/* Copyright (c) 2016 Tobias Buschor https://goo.gl/gl0mbf | MIT License https://goo.gl/HgajeK */

import * as dnd from '../../js/drag/drag.js';

const dropzoneHandler = {
    dragstart: () => {
        if (!dnd.dragged) return; // just handle elements for now
        const zones = document.querySelectorAll('[u2-dropzone]');
        zones.forEach(zone => {
            const valid = canDrop(zone, dnd.dragged);
            zone.classList.toggle(':drop-invalid', !valid);
            zone.classList.toggle(':drop-valid', valid);
        });
    },
    dragend: () => {
        document.querySelectorAll('[u2-dropzone]').forEach(zone => {
            zone.classList.remove(':drop-invalid', ':drop-valid', ':dragover');
        });
    },
    dragover: (e) => {
        const dropzone = e.target.closest('[u2-dropzone]');
        if (!dropzone || !dnd.dragged) return;
        dropzone.classList.add(':dragover');
        if (!canDrop(dropzone, dnd.dragged)) return;

        const before = getElementBefore(dropzone, e);
        indicateDrop(dropzone, 'before', before);

        e.preventDefault();
    },
    dragleave: (e) => {
        const dropzone = e.target.closest('[u2-dropzone]');
        if (!dropzone) return;
        if (!dropzone.contains(e.relatedTarget)) {
            dropzone.classList.remove(':dragover');
            indicateDrop(null);
        }
    },
    drop: (e) => {
        e.preventDefault();
        const dropzone = e.target.closest('[u2-dropzone]');
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
        dropzone.dispatchEvent(new CustomEvent('u2-dropzone-drop', {
            detail: { add: dnd.dragged },
            bubbles: true
        }));

        const performDrop = () => dropzone.insertBefore(dnd.dragged, before);

        if (document.startViewTransition) {
            document.startViewTransition(performDrop)
        } else {
            performDrop();
        }

        indicateDrop(null);
    }
};

Object.entries(dropzoneHandler).forEach(([type, handler]) => document.addEventListener(type, handler));








function getElementBefore(container, e) {
    const children = [...container.children].filter(child => child !== dnd.dragged);

    if (children.length === 0) return null;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Layout-Richtung erkennen
    const layout = detectLayout(container, children);

    // Alle Elemente mit Position und Distanz
    const elements = children.map(child => {
        const box = child.getBoundingClientRect();
        return {
            element: child,
            box,
            centerX: box.left + box.width / 2,
            centerY: box.top + box.height / 2
        };
    });

    // Nach visueller Position sortieren
    elements.sort((a, b) => {
        if (layout === 'vertical') {
            return a.centerY - b.centerY;
        } else if (layout === 'horizontal') {
            return a.centerX - b.centerX;
        } else {
            // Grid/Flex mit Wrapping: erst Y, dann X
            const yDiff = Math.abs(a.centerY - b.centerY);
            if (yDiff > 10) return a.centerY - b.centerY;
            return a.centerX - b.centerX;
        }
    });

    // Finde erstes Element NACH der Maus
    for (const item of elements) {
        const isAfter = layout === 'vertical'
            ? item.centerY > mouseY
            : layout === 'horizontal'
                ? item.centerX > mouseX
                : isAfterInGrid(item, mouseX, mouseY);

        if (isAfter) return item.element;
    }

    return null; // Am Ende einfügen
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

    // Heuristik: Vergleiche erste zwei Elemente
    const first = children[0].getBoundingClientRect();
    const second = children[1].getBoundingClientRect();

    const verticalGap = Math.abs(second.top - first.bottom);
    const horizontalGap = Math.abs(second.left - first.right);

    // Gleiche Zeile = horizontal
    if (Math.abs(first.top - second.top) < 10) {
        return 'horizontal';
    }

    // Gleiche Spalte = vertical
    if (Math.abs(first.left - second.left) < 10) {
        return 'vertical';
    }

    // Wrapping Grid/Flex
    return 'grid';
}
function isAfterInGrid(item, mouseX, mouseY) {
    const { box, centerX, centerY } = item;

    // Element ist in einer späteren Zeile
    if (centerY > mouseY + box.height / 4) return true;

    // Gleiche Zeile, aber rechts von Maus
    const sameLine = Math.abs(centerY - mouseY) < box.height / 2;
    if (sameLine && centerX > mouseX) return true;

    return false;
}














// === Helper Function ===
function canDrop(dropzone, dragged) {
    let selector = dropzone.getAttribute('u2-dropzone').trim();
    if (selector === '*') return true;
    if (!selector) selector = ':scope > *'; // just own
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

    if (!element) {
        if (position === 'after') {
            element = container.firstElementChild;
            position = 'before';
        }
        if (position === 'before') {
            element = container.lastElementChild;
            position = 'after';
        }
    }

    let indicator = document.getElementById('drop-indicator');
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
    // Verstecken
    if (!container) {
        indicator.hidePopover();
        return;
    }


    // Leerer Container
    if (!element) {
        const rect = container.getBoundingClientRect();
        const styles = getComputedStyle(container);
        const paddingTop = parseFloat(styles.paddingTop);
        const paddingLeft = parseFloat(styles.paddingLeft);

        indicator.className = 'vertical';
        indicator.style.top = `${rect.top + paddingTop}px`;
        indicator.style.left = `${rect.left + paddingLeft}px`;
        indicator.style.width = `${rect.width - paddingLeft - parseFloat(styles.paddingRight)}px`;
        indicator.showPopover();
        return;
    }

    // Orientierung erkennen
    const sibling = position === 'before'
        ? element.previousElementSibling
        : element.nextElementSibling;
    const isHorizontal = detectHorizontalLayout(element, sibling);

    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);

    if (isHorizontal) {
        // VERTIKALER Indikator (zwischen horizontal angeordneten Elementen)
        indicator.className = 'horizontal';

        let left;
        if (sibling) {
            const siblingRect = sibling.getBoundingClientRect();
            const siblingStyles = getComputedStyle(sibling);

            if (position === 'before') {
                // Zwischen previousSibling und element
                const gap = rect.left - siblingRect.right;
                left = siblingRect.right + gap / 2;
            } else {
                // Zwischen element und nextSibling
                const gap = siblingRect.left - rect.right;
                left = rect.right + gap / 2;
            }
        } else {
            // Kein Nachbar: Am Rand mit Margin
            const margin = position === 'before'
                ? parseFloat(styles.marginLeft)
                : parseFloat(styles.marginRight);
            left = position === 'before'
                ? rect.left - margin / 2
                : rect.right + margin / 2;
        }

        indicator.style.left = `${left - 1}px`;
        indicator.style.top = `${rect.top}px`;
        indicator.style.height = `${rect.height}px`;
        indicator.style.width = '2px';

    } else {
        // HORIZONTALER Indikator (zwischen vertikal angeordneten Elementen)
        indicator.className = 'vertical';

        let top;
        if (sibling) {
            const siblingRect = sibling.getBoundingClientRect();

            if (position === 'before') {
                // Zwischen previousSibling und element
                const gap = rect.top - siblingRect.bottom;
                top = siblingRect.bottom + gap / 2;
            } else {
                // Zwischen element und nextSibling
                const gap = siblingRect.top - rect.bottom;
                top = rect.bottom + gap / 2;
            }
        } else {
            // Kein Nachbar: Am Rand mit Margin
            const margin = position === 'before'
                ? parseFloat(styles.marginTop)
                : parseFloat(styles.marginBottom);
            top = position === 'before'
                ? rect.top - margin / 2
                : rect.bottom + margin / 2;
        }

        indicator.style.top = `${top - 1}px`;
        indicator.style.left = `${rect.left}px`;
        indicator.style.width = `${rect.width}px`;
        indicator.style.height = '2px';
    }

    indicator.showPopover();
}

function detectHorizontalLayout(element, sibling) {
    if (!sibling) return false;

    const rect = element.getBoundingClientRect();
    const siblingRect = sibling.getBoundingClientRect();

    const yDiff = Math.abs(rect.top - siblingRect.top);
    const avgHeight = (rect.height + siblingRect.height) / 2;

    return yDiff < avgHeight * 0.5;
}