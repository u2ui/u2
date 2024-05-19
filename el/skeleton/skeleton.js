
class skeleton extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.render();
        this.inert = true;
    }
    render() {
        const template = this.getAttribute('template');
        requestAnimationFrame(() => {
            this.innerHTML = templateToHtml(template)
        });
    }
    static get observedAttributes() {
        return ['template'];
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        this.render();
    }
}

customElements.define('u2-skeleton', skeleton);





function templateToHtml(template) {
    let placeholderHTML = '';
    const elements = template.split(' ');
    elements.forEach(element => {
        let [tagName, options] = element.split('(');
        options = options ? options.slice(0, -1) : '';

        if (tagName === '-') {
            placeholderHTML += '<span style="flex-grow:1;"><s hidden></s></span>';
        } else if (tagName === 'table') {
            const [rows, cols] = options.split('x');
            placeholderHTML += '<table>';
            for (let i = 0; i < parseInt(rows); i++) {
                placeholderHTML += '<tr>';
                for (let j = 0; j < parseInt(cols); j++) {
                    placeholderHTML += '<td></td>';
                }
                placeholderHTML += '</tr>';
            }
            placeholderHTML += '</table>';
        } else {
            placeholderHTML += `<${tagName}></${tagName}>`;
        }

    });

    placeholderHTML += '';
    return placeholderHTML;
}




// usage:
// <u2-skeleton>
// h2
// img p
// p
// p
// table(4,6)
// - button button
// </u2-skeleton>
