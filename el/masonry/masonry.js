

export default class U2Masonry extends HTMLElement{    
    constructor(){
        super();
        this.classList.add('-Js');
        this.rObserver = new ResizeObserver(() => this.render());
    }
    connectedCallback(){
        this.render();
        this.rObserver.observe(this);
    }
    disconnectedCallback(){
        this.rObserver.disconnect();
    }
    render(){
        const widthContainer = this.clientWidth;
        if (!widthContainer) return;
        const style = getComputedStyle(this);
        let minWidth = cssLengthToPixels(style.getPropertyValue('--u2-Items-width'), this, style) || 200;
        const rowGap = cssLengthToPixels(style.getPropertyValue('row-gap'), this, style) ?? 0;
        const columnGap = cssLengthToPixels(style.getPropertyValue('column-gap'), this, style) ?? 0;

        minWidth = Math.min(widthContainer, minWidth);
    
        const columns = Math.floor((widthContainer + columnGap) / (minWidth + columnGap));
        const columnWidth = (widthContainer - columnGap * (columns - 1)) / columns;
        const columnHeights = Array.from({length: columns}, (_, i) => [i, 0]);

        requestAnimationFrame(() => { // todo: prevent reflow: set all widths first
            for (const current of this.children){
                if (current.offsetParent === null) continue;
                current.style.width = columnWidth + 'px';
                current.style.left = columnHeights[0][0] * (columnWidth + columnGap) + 'px';
                current.style.top  = columnHeights[0][1] + 'px';
                columnHeights[0][1] += current.offsetHeight + rowGap;
                columnHeights.sort(sortByHeight);
                this.rObserver.observe(current); // performance ok?
            }
            this.style.height = columnHeights[columns - 1][1] - rowGap + 'px';
        });
    }    
}

customElements.get('u2-masonry') || customElements.define('u2-masonry', U2Masonry);


function sortByHeight(a, b){
    return a[1] - b[1] || a[0] - b[0];
}


/* helper */
/* todo: similiar code in styler.js (unitToPx) and variable-styler.js */
function cssLengthToPixels(length, element, style = getComputedStyle(element)) {
    if (length === undefined) return undefined;
    length = length.trim();
    const value = parseFloat(length);
    const unit = length.match(/\D+$/)?.[0] || '';
    switch (unit) {
        case '':
        case 'px':
            return value;
        case 'em':
            return value * parseFloat(style.fontSize);
        case 'rem':
            return value * parseFloat(getComputedStyle(document.documentElement).fontSize);
        case '%':
            return (value / 100) * parseFloat(getComputedStyle(element.parentNode).width);
        case 'vh':
            return value * (innerHeight / 100);
        case 'vw':
            return value * (innerWidth / 100);
        case 'vmin':
            return value * (Math.min(innerHeight, innerWidth) / 100);
        case 'vmax':
            return value * (Math.max(innerHeight, innerWidth) / 100);
        case 'pt':
            return value * 96 / 72;
        default:
            console.error('Unsupported length unit:', unit);
            return NaN;
    }
}
