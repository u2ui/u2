

class masonry extends HTMLElement{    
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
        this.rObserver.unobserve(this);
    }
    render(){
        const widthContainer = this.clientWidth;
        if (!widthContainer) return;
        let minWidth = cssLengthToPixelsStyle(this, '--u2-Items-width') || 200;
        const rowGap = cssLengthToPixelsStyle(this, 'row-gap') ?? 0;
        const columnGap = cssLengthToPixelsStyle(this, 'column-gap') ?? 0;

        minWidth = Math.min(widthContainer, minWidth);
    
        const columns = Math.floor((widthContainer + columnGap) / (minWidth + columnGap));
        const columnWidth = (widthContainer - columnGap * (columns - 1)) / columns;
        const columnHeights = [];
        for (let i = 0; i < columns; i++){
            columnHeights[i] = [i, 0];
        }

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

customElements.define('u2-masonry', masonry);


function sortByHeight(a, b){
    return a[1] - b[1] || a[0] - b[0];
}


/* helper */
function cssLengthToPixelsStyle(element, property) {
    const length = getComputedStyle(element).getPropertyValue(property);
    return cssLengthToPixels(length, element);
}
function cssLengthToPixels(length, element) {
    if (length === undefined) return undefined;
    length = length.trim();
    const value = parseFloat(length);
    const unit = length.match(/\D+$/)[0];
    switch (unit) {
        case '':
        case 'px':
            return value;
        case 'em':
            const fontSize = parseFloat(getComputedStyle(element).fontSize);
            return value * fontSize;
        case 'rem':
            const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
            return value * rootFontSize;
        case '%':
            const parentSize = parseFloat(getComputedStyle(element.parentNode).width);
            return (value / 100) * parentSize;
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
