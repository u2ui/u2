
/**
 * Zeigt einen Drop-Indicator relativ zu einem Element
 * @param {'before'|'after'|null} position - Position des Indicators oder null zum Verstecken
 * @param {HTMLElement|null} element - Referenz-Element
 */
export function indicateDrop(position, element) {
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
                height: 2px;
                background: #2563eb;
                pointer-events: none;
                overflow:visible;
                transition: top .07s ease-out;
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
            }
            <style>
        `;
        document.body.appendChild(indicator);
    }

    if (!position || !element) {
        indicator.hidePopover();
        return;
    }

    const rect = element.getBoundingClientRect();
    const top = position === 'before' ? rect.top : rect.bottom;

    indicator.style.top = `${top - 1}px`;
    indicator.style.left = `${rect.left}px`;
    indicator.style.width = `${rect.width}px`;
    indicator.showPopover();
}