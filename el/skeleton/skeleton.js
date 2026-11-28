
export default class U2Skeleton extends HTMLElement {
    connectedCallback() {
        this.render();
        this.inert = true;
    }
    render() {
        const template = this.getAttribute('template');
        if (template == null) return;
        requestAnimationFrame(() => {
            this.innerHTML = templateToHtml(template)
        });
    }
    static observedAttributes = ['template'];
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        this.render();
    }
}

customElements.get('u2-skeleton') || customElements.define('u2-skeleton', U2Skeleton);





function templateToHtml(template) {
    let placeholderHTML = '';
    const elements = template.split(' ');
    elements.forEach(element => {
        let [tagName, options] = element.split('(');
        options = options ? options.slice(0, -1) : '';

        if (tagName === '-') {
            placeholderHTML += '<span style="flex-grow:1;"><s hidden></s></span>';
        } else if (tagName === 'table') {
            const [rows, cols] = options.split('x').map(n => Math.max(0, parseInt(n) || 0));
            placeholderHTML += `<table>${`<tr>${'<td></td>'.repeat(cols)}</tr>`.repeat(rows)}</table>`;
        } else {
            placeholderHTML += `<${tagName}></${tagName}>`;
        }

    });

    return placeholderHTML;
}




// usage:
// <u2-skeleton>
// h2
// img p
// p
// p
// table(4x6)
// - button button
// </u2-skeleton>
