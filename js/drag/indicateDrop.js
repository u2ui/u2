
// HINWEIS: In attr/dropzone/dropzone.js gibt es eine eigene, reichere indicateDrop-Variante
// (horizontal/vertikal, Gap-Zentrierung, leerer Container). Bewusst noch nicht zusammengeführt —
// diese hier kann dafür into-Rahmen + content-Box-Inset. Bei Änderungen ggf. dort mitdenken.

/**
 * Zeigt einen Drop-Indicator relativ zu einem Element
 * @param {'before'|'after'|'into'|null} position - Position des Indicators oder null zum Verstecken
 * @param {HTMLElement|null} element - Referenz-Element
 * @param {object} [options]
 * @param {'border'|'content'} [options.box='border'] - Bezugsbox des Elements, auf allen Seiten gleich.
 *        'content' = innerhalb des Paddings (macht z.B. Einrückungen sichtbar).
 */
export function indicateDrop(position, element, { box = 'border' } = {}) {
    let indicator = document.getElementById('drop-indicator');

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
                border: none;
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
                &[data-into] {  /* Rahmen statt Linie */
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

    if (!position || !element) {
        indicator.hidePopover();
        return;
    }

    const rect = element.getBoundingClientRect();
    const s = indicator.style;
    let top = rect.top, bottom = rect.bottom, left = rect.left, width = rect.width, height = rect.height;
    if (box === 'content') {  // echte Content-Box, alle Seiten gleich behandelt
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
