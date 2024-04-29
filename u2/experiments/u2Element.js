



// import sheet from './styles.css' assert { type: 'css' };
// document.adoptedStyleSheets = [sheet];
// shadowRoot.adoptedStyleSheets = [sheet];
// polyfill:
// ussage:
// sheet = await importStyleSheet('./styles.css');

// todo:
// async function importSheet(url) {
//     const path = new Error().stack.split('\n')[1].match(/\((.*):/)[1];
//     url = new URL(url, path).href;
//     const css = await fetch(url).then(res => res.text());
//     const sheet = new CSSStyleSheet();
//     sheet.replaceSync(css);
//     return sheet;
// }

export class U2Element extends HTMLElement {

    static properties = {};

    constructor() {
        super();
        this._attributes = new Map();
        
        // events
        for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
            if (key.startsWith('on')) {
                const eventName = camelToKebab(key).slice(3);
                this.addEventListener(eventName, this);
            }
        }


        // only first
        const first = !this.constructor._firstDone;
        if (first) {


            // css
            if (this.constructor.css) {
                // create a styleSheet
                const styleSheet = new CSSStyleSheet();
                styleSheet.replaceSync(this.constructor.css);
                this.constructor._generatedStyleSheet = styleSheet;
            }
    

            // outerCss
            if (this.constructor.outerCss) {
                const el = document.createElement('style');
                el.textContent = this.tagName+' { '+this.constructor.outerCss+' } ';
                document.head.append(el);
            }

            this.constructor._firstDone = true;
        }
        
        if (this.constructor.shadow) {
            this.attachShadow({mode: 'open'});
            this.shadowRoot.innerHTML = this.constructor.shadow;
            this.shadowRoot.adoptedStyleSheets = [this.constructor._generatedStyleSheet];
        }

        //console.log(this.shadowRoot.adoptedStyleSheets);
    }
    static outerStyle = null;

    // events
    handleEvent(e) {
        const method = kebabToCamel('on-'+e.type);
        this[method]?.(e);
    }

    // attributes
    attr(name) {
        if (!this._attributes.has(name)) {
            const signal = new Signal.State(this.getAttribute(name));
            this._attributes.set(name, signal);
        }
        return this._attributes.get(name);        
    }
    attributeChangedCallback(name, oldValue, newValue) {
        this.attr(name).set(newValue);
    }
}

const camelToKebab = (str) => str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
const kebabToCamel = (str) => str.replace(/-[a-z]/g, m => m[1].toUpperCase());


/* ussage:

class myEl extends u2Element {
    static properties = {
        name: {
            type: String,
            reflect: true,
            attribute: 'name'
        },
        age: {
            type: Number,
            reflect: true
        }
    }
    onU2Open(e) {
        console.log('opened');
    }
    static outerCss = `
        display:block;
        & button {
            background-color: red;
        }
    `
}


const el = document.createElement('my-el');

el.attr('name').set('John');

el.setAttribute('name', 'John'); // same
el.name = 'John'; // same

effect(()=>{
    console.log(el.attr('name').get());
})

el.name = 'Jane'; // triggers effect





*/