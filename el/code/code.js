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
            inline-size:max-content;
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
            padding:.2rem !important;
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
        <textarea autocomplete=off autocorrect=off autocapitalize=off spellcheck=false autocorrect=off></textarea>
        <slot id=tools name=tools></slot>
        <link rel="stylesheet" href="${libRoot}styles/github.min.css">
        `;
        // would be great, if in the case of a hightlighted textarea, the original textarea would be used

        this.sourceMutationObserver = new MutationObserver(()=>{
            this.value = this.getSourceValue();
        });
            
        this.textarea = this.shadowRoot.querySelector('textarea');
    }
    connectedCallback() {
        requestAnimationFrame(()=>this._init());
    }
    _init(){

        this.textarea.addEventListener('input', e => {
            this.setHightlightValue(e.target.value);
            this.setSourceValue(e.target.value);
        });

        this.textarea.addEventListener('blur', e => { // if textarea is focused, the code is not updated
            if (this.unUpdatedValue == null) return;
            this.value = this.unUpdatedValue;
        });

        const elementId = this.getAttribute('element');
        if (elementId) {
            this.setForeignElement(document.getElementById(elementId));
            return;
        } else {
            this.sourceElement = this.querySelector('pre>code,textarea,style,script') || this;
        }

        if (this.sourceElement.tagName === 'TEXTAREA') {
            this.setAttribute('editable','');
        }

        this.value = this.getSourceValue();
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
        if (this.isForeign) return 'html';
        return false;
    }
    setHightlightValue(value){
        if (!this.libLoaded) this.shadowRoot.querySelector('#code').innerHTML = htmlEncode(value); // fast display and then highlight
        libPromise.then( ({default:hljs})=>{
            this.libLoaded = true;
            const language = this.language;
            requestAnimationFrame(()=>{
                this.shadowRoot.querySelector('#code').innerHTML = (
                    language ?
                      hljs.highlight(value, {language}) :
                      hljs.highlightAuto(value)
                  ).value + '<br>';
            });
        });
    }
    setSourceValue(value){

        // //this._recentlySetSourceValue = true;
        // setTimeout(()=>this._recentlySetSourceValue = false);

        const el = this.sourceElement;
        if (el.tagName === 'TEXTAREA') { el.value = value; return; }
        if (this.isForeign) {
            el.innerHTML = value;
        } else {
            el.textContent = value;
        }
    }
    getSourceValue(){
        const el = this.sourceElement;
        if (el.tagName === 'TEXTAREA') return el.value;
        if (el.tagName === 'SCRIPT') return el.textContent.replaceAll('\\/script>','/script>');
        if (this.isForeign) {
            return el.innerHTML;
        } else {
            return el.textContent;
        }
    }
    setForeignElement(element){
        this.isForeign = true;
        this.sourceElement = element;
        if (!element) console.error('u2-code: element not found');
        this.sourceMutationObserver.disconnect();
        this.sourceMutationObserver.observe(element, {subtree:true, characterData:true, attributes:true, childList:true});
        this.value = this.getSourceValue();
    }
    get value(){
        return this.textarea.value; // better this one
        //return this.getSourceValue();
    }
    set value(value){
        if (this.trim) value = trimCode(value);

        if (value === this.textarea.value) return;

        // setInputValueKeepSelection(this.textarea, value); way too slow
        this.unUpdatedValue = null;
        if (this.textarea.matches(':focus')) {
            this.unUpdatedValue = value;
            return;
        }

        this.setHightlightValue(value);
        this.textarea.value = value;

    }
    setSelectionRange(start, end){
        this.textarea.setSelectionRange(start, end);
    }
    focus(){
        this.textarea.focus();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'trim') {
            this.trim = newValue!=null;
            if (this.sourceElement) this.value = this.getSourceValue();
        }
        if (name === 'editable') this.shadowRoot.getElementById('code').inert = newValue!=null;
        if (name === 'element') this.setForeignElement(document.getElementById(newValue));
    }
    static observedAttributes = ['trim', 'editable', 'element'];

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



/* helper */


// /* functions */
// function setInputValueKeepSelection(input, newValue) {
//     // if (document.activeElement !== input) { // not good for shadow dom
//     //     input.value = newValue;
//     //     return;
//     // }
//     if (!input.matches(':focus')) {
//         input.value = newValue;
//         return;
//     }
//     if (input.value === newValue) return;
//     const selectionStart = input.selectionStart;
//     const selectionEnd = input.selectionEnd;
//     const oldString = input.value;
//     const newPositionStart = positionAfterUpdate(oldString, selectionStart, newValue);
//     const newPositionEnd = positionAfterUpdate(oldString, selectionEnd, newValue);
//     input.value = newValue;
//     input.setSelectionRange(newPositionStart, newPositionEnd);
// }

// function positionAfterUpdate(initialString, initialPosition, newString) {
//     let minDistance = Infinity;
//     let newPosition = -1;
//     for (let i = 0; i <= newString.length; i++) {
//         const a = initialString.substring(0, initialPosition) + newString.substring(i);
//         const b = newString.substring(0, i) + initialString.substring(initialPosition);
//         const distance = levenshteinDistance(a, b);
//         if (distance < minDistance) {
//             minDistance = distance;
//             newPosition = i;
//         }
//     }
//     return newPosition;
// }



// function levenshteinDistance(a, b) {
//     if (a.length > b.length) [a, b] = [b, a];
//     const previousRow = Array.from({length: a.length + 1}, (_, i) => i);
//     const currentRow = new Array(a.length + 1);
//     for (let i = 1; i <= b.length; i++) {
//         currentRow[0] = i;
//         for (let j = 1; j <= a.length; j++) {
//             const cost = a[j - 1] === b[i - 1] ? 0 : 1;
//             currentRow[j] = Math.min(
//                 currentRow[j - 1] + 1,
//                 previousRow[j] + 1,
//                 previousRow[j - 1] + cost
//             );
//         }
//         [previousRow, currentRow] = [currentRow, previousRow];
//     }
//     return previousRow[a.length];
// }
