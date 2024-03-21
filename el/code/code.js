// other highlighter that could be used: https://github.com/shikijs/shiki

const libRoot = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/';
const libPromise = import(libRoot + 'es/highlight.min.js');

class code extends HTMLElement {
    constructor() {
        super();
        let shadowRoot = this.attachShadow({mode:'open'});
        shadowRoot.innerHTML =
        `<style>
        :host {
            position:relative;
            white-space:normal !important;
            display:grid !important; /* todo, move main css? would also be useful there. Why important? could be problematic */
        }
        :host > * {
            grid-area:1/1;
            line-height:inherit;
            font:inherit;
            white-space:pre;
        }
        #code {
            width:max-content;
        }
        textarea {
            display:none;
            resize:none;
            background-color:transparent;
            color:#0000;
            caret-color:#000;
            border:0;
            margin:0;
            padding:0;
            outline:none;
        }
        #tools {
            white-space:normal;
            transition:.1s;
            display:flex;
            justify-content:flex-end;
            align-items:start;
            gap:.3em;
            pointer-events:none;
        }
        #tools::slotted(button) {
            position:sticky !important;
            right:0;
            top:0;
            pointer-events:all;
            margin:0 !important;
            padding:.3rem !important;
            text-align:center !important;
            background-color:transparent !important;
            color:inherit !important;
        }
        :host(:not(:hover)) #tools {
            opacity:0;
            visibility:hidden;
        }
        :host([editable]) textarea {
            display:block !important;
        }
        </style>


        <div id=code></div>
        <textarea autocomplete=off autocorrect=off autocapitalize=off spellcheck=false></textarea>
        <slot id=tools name=tools></slot>
        <link rel="stylesheet" href="${libRoot}styles/github.min.css">
        `;
        // would be great, if in the case of a hightlighted textarea, the original textarea would be used

        this.textarea = shadowRoot.querySelector('textarea');

        this.textarea.addEventListener('input', e => {
            this.setHightlightValue(e.target.value);
            this.setSourceValue(e.target.value);
        });
    }
    copy(){
        let code = this.shadowRoot.querySelector('#code').textContent;
        navigator.clipboard.writeText(code);
    }
    get language(){
        if (this.hasAttribute('language')) return this.getAttribute('language');
        const el = this.sourceElement;
        if (el.tagName === 'STYLE') return 'css';
        if (el.tagName === 'TEMPLATE') return 'html';
        if (el.tagName === 'SCRIPT') {
            const type = el.getAttribute('type');
            if (type==='module') return 'javascript';
            if (type) return type.replace(/^text\/(x-)?/, '');
            return 'javascript';
        }
        return false;
    }
    setHightlightValue(value){
        if (!this.libLoaded) this.shadowRoot.querySelector('#code').innerHTML = htmlEncode(value); // fast display and then highlight
        libPromise.then( ({default:hljs})=>{
            this.libLoaded = true;
            const language = this.language;
            this.shadowRoot.querySelector('#code').innerHTML = (
                language ?
                  hljs.highlight(value, {language}) :
                  hljs.highlightAuto(value)
              ).value + '<br>';
        });
    }
    setSourceValue(value){
        const el = this.sourceElement;
        if (el.tagName === 'TEXTAREA') { el.value = value; return; }
        if (this.element) {
            el.innerHTML = value;
        } else {
            el.textContent = value;
        }
    }
    getSourceValue(){
        const el = this.sourceElement;
        if (el.tagName === 'TEXTAREA') return el.value;
        if (el.tagName === 'SCRIPT') return el.textContent.replaceAll('\\/script>','/script>');
        if (this.element) {
            return el.innerHTML;
        } else {
            return el.textContent;
        }
    }
    connectedCallback() {

        this.element = this.getAttribute('element');
        if (this.element) {
            this.sourceElement = document.getElementById(this.element);
            if (!this.sourceElement) console.error('u2-code: element not found', this.element);
            // todo: add observer to update value on mutation
            const mO = new MutationObserver(()=>{
                let value = this.getSourceValue();
                if (this.trim) value = trimCode(value);
                this.setHightlightValue(value);
                this.textarea.value = value;
            });
            mO.observe(this.sourceElement, {childList:true, subtree:true, characterData:true});

            
        } else {
            this.sourceElement = this.querySelector('pre>code,textarea,style,script') || this;
        }

        if (this.sourceElement.tagName === 'TEXTAREA') {
            this.setAttribute('editable','');
        }
        let value = this.getSourceValue();
        this.value = value;
        // if (this.trim) value = trimCode(value);
        // this.setHightlightValue(value);
        // this.textarea.value = value;
    }
    get value(){
        return this.textarea.value; // better this one
        //return this.getSourceValue();
    }
    set value(value){
        if (this.trim) value = trimCode(value);
        this.setHightlightValue(value);
        this.textarea.value = value;
    }
    setSelectionRange(start, end){
        this.textarea.setSelectionRange(start, end);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'trim') this.trim = newValue!=null;
    }
    static get observedAttributes() { return ['trim'] }
}

customElements.define('u2-code', code);


function trimCode(value){
    const lines = value.split('\n');
    // remove first and last lines if only contains whitespaces
    while (lines[0] != null && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    // evaluate min num of starting whitespace
    let minWhitespace = 999;
    for (const line of lines) {
        if (line.match(/^\s*$/)) continue; // ignore empty lines
        const num = line.match(/^\s*/)[0].length;
        if (num < minWhitespace) minWhitespace = num;
    }
    // remove starting minWhitespaces and join lines
    return lines.map(line => line.slice(minWhitespace)).join('\n');
}
function htmlEncode(input) {
    return input.replace(/[\u00A0-\u9999<>\&]/g, function(i) {
        return '&#'+i.charCodeAt(0)+';';
    });
}
