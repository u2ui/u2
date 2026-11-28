
// NOTE: attr/dropzone/dropzone.js has its own, richer indicateDrop variant
// (horizontal/vertical, gap centering, empty container). Deliberately not merged yet —
// this one has the into frame + content-box inset instead. Keep both in mind when changing.

/**
 * Shows a drop indicator relative to an element
 * @param {'before'|'after'|'into'|null} position - position of the indicator, or null to hide it
 * @param {HTMLElement|null} element - reference element
 * @param {object} [options]
 * @param {'border'|'content'} [options.box='border'] - the element's reference box, the same on all sides.
 *        'content' = inside the padding (shows e.g. indentation).
 */
export function indicateDrop(position, element, { box = 'border' } = {}) {
    let indicator = document.getElementById('drop-indicator');
    if (!position || !element) return indicator?.hidePopover();

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'drop-indicator';
        indicator.popover = 'manual';
        indicator.innerHTML = `
            <style>
            #drop-indicator {
                --color: var(--blue, #2563eb);
                position: fixed;
                margin: 0;
                padding: 0;
                border:0 solid var(--color);
                height: 2px;
                background: var(--color);
                pointer-events: none;
                overflow:visible;
                transition: .07s ease-out;
                &::before, &::after {
                    content: "";
                    width: 9px;
                    height: 9px;
                    border-radius: 99px;
                    background: inherit;
                    position: absolute;
                    top: -4px;
                    left: -5px;
                }
                &::after {
                    right:-5px; left:auto;
                }
                &[data-into] {  /* frame instead of line */
                    height:auto;
                    background:none;
                    background: color-mix(in srgb, var(--color) 10%, transparent);
                    border-width:2px;
                    &::before, &::after { xdisplay:none }
                }
            }
            </style>
        `;
        document.body.appendChild(indicator);
    }

    const rect = element.getBoundingClientRect();
    const s = indicator.style;
    let top = rect.top, bottom = rect.bottom, left = rect.left, width = rect.width, height = rect.height;
    if (box === 'content') {  // real content box, all sides treated the same
        const cs = getComputedStyle(element);
        const [pt, pr, pb, pl] = ['Top', 'Right', 'Bottom', 'Left'].map(k => parseFloat(cs['padding' + k]) || 0);
        top += pt; bottom -= pb; left += pl; width -= pl + pr; height -= pt + pb;
    }
    s.left = `${left}px`;
    s.width = `${width}px`;
    indicator.toggleAttribute('data-into', position === 'into');
    if (position === 'into') { s.top = `${top}px`; s.height = `${height}px`; }
    else { s.top = `${(position === 'before' ? top : bottom) - 1}px`; s.height = ''; }
    indicator.showPopover();
}
