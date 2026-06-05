// TODO: 
// - should we move the dom inside shadowDom to avoid style conflicts?
//  or should we add an option to use shadowDom or just to define the container for the dialog-element?
// - rename to modal.js? see <iframe sandbox="allow-modals">

const d = document;
const sheet = new CSSStyleSheet();
sheet.replaceSync(`.u2x-modal .-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: .5rem;
    margin-top: 1rem;
}`);


class Dialog {
    constructor(options) {

        const element = this.element = d.createElement('dialog');
        element.classList.add('u2x-modal');
        // element.role = 'alertdialog'; // todo: internals.role = 'alertdialog'; ?
        element.innerHTML = 
            `<form method=dialog>
                ${options.body}
                ${options.buttons?'<div class=-buttons u2-focusgroup></div>':''}
            </form>`;

        const btnCont = element.querySelector('.-buttons');
        if (options.buttons) {

            import('../../attr/focusgroup/focusgroup.js');

            options.buttons.forEach((btn, i)=>{
                const el = d.createElement('button');
                el.innerHTML = btn.title;
                el.value = btn.value;
                el.type = btn.type || 'submit';
                el.addEventListener('click', e=>{
                    btn.action && btn.action.call(this,e);
                });
                btnCont.appendChild(el);
                if (i === 0) setTimeout(()=>el.focus());
            });
        }
        this.options = options;
        options.init && options.init(this.element);
    }
    show(){
        const element = this.element;
        (this.options.root ?? d.body).appendChild(element);
        // make our styles available in the current root (document or a shadow root)
        const root = element.getRootNode();
        if (!root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets.push(sheet);
        element.showModal();
        if (this.options.audio) {
            const url = this.options.audio === true ? import.meta.url + '/../notification.mp3' : this.options.audio;
            const audio = new Audio();
            audio.volume = 0.2;
            audio.src = url;
            audio.play().catch(()=>{}); // autoplay policy may reject
        }

        return new Promise(resolve=>{
            element.addEventListener('close',()=>{
                resolve(this.value);
                element.remove();
            });
        });

    }
}

/**
 * Creates and shows a dialog with an alert message.
 * @param {string} text - The text to be displayed in the alert dialog.
 * @returns {Promise<undefined>} A Promise that resolves to undefined when the dialog is closed.
 * @example
 * await alert('This is an alert message');
 */
export function alert(text, defaults) {
    const options = toOptions(text, defaults);
    options.buttons = [{title:'OK'}];
    return new Dialog(options).show();
};

/**
 * Creates and shows a dialog with a confirmation message.
 * @param {string} text - The text to be displayed in the confirmation dialog.
 * @returns {Promise<boolean>} A Promise that resolves to true if the user clicks the OK button, and false if the user clicks the Cancel button.
 * @example
 * if (await confirm('Do you want to delete this item?')) {
 *    deleteItem();
 * }
 */
export function confirm(text, defaults) {
    const options = toOptions(text, defaults);
    options.buttons = [
        {title: 'OK',action(){ dialog.value = true; } },
        {title: translate(options.lang, 'Cancel')}
    ];
    const dialog = new Dialog(options);
    dialog.value = false;
    return dialog.show();
};

/**
 * Creates and shows a dialog with a prompt message.
 * @param {string} text - The text to be displayed in the prompt dialog.
 * @param {string} [initial] - The initial value of the input field.
 * @returns {Promise<string>} A Promise that resolves to the value entered by the user, or null if the user clicks the Cancel button.
 * @example
 * const name = await prompt('Enter your name:');
 */
export function prompt(text, initial, defaults) {
    const options = toOptions(text, defaults);
    options.body = '<label>'+options.body+'<input style="width:100%;display:block;margin-top:.5rem"></label>';
    options.buttons = [
        {title: 'OK', action(){ dialog.value = input.value; } },
        {title: translate(options.lang, 'Cancel')}
    ];
    const dialog = new Dialog(options);
    const input = dialog.element.querySelector('input');
    input.value = initial ?? '';
    setTimeout(()=>input.focus());
    dialog.value = null;
    return dialog.show();
};

/* */
export function form(html, defaults){
    if (typeof html === 'string') html = { body: html };
    const options = toOptions(html, defaults);
    options.buttons =
        [{title:'OK',action(){ // TODO: triggers by click but would be better by form.submit?
            const form = dialog.element.querySelector('form');
            if (!form.checkValidity()) dialog.value = null;
            else {
                const data = Object.fromEntries(new FormData(form).entries());
                dialog.value = data;
            }
        }},{title: translate(options.lang, 'Cancel'), type:'button', action(){
            dialog.element.close();
        }}];

    const dialog = new Dialog(options);
    return dialog.show();
}
/* */

// bind default options (e.g. a shadow root and/or lang) to all dialogs:
// const m = scope({root: this.shadowRoot, lang:'de'}); m.alert('hi')
export function scope(defaults){
    return {
        alert:   (text)          => alert(text, defaults),
        confirm: (text)          => confirm(text, defaults),
        prompt:  (text, initial) => prompt(text, initial, defaults),
        form:    (html)          => form(html, defaults),
    };
}


// close dialog on backdrop-click if it has the backdropClose-class
addEventListener('click', event=>{
    const el = event.composedPath()[0]; // composedPath: real target, also inside shadow DOM
    if (el.tagName !== 'DIALOG') return;
    if (!el.classList.contains('backdropClose')) return;
    const rect = el.getBoundingClientRect();
    let isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
    if (isInDialog) return;
    el.close();
    //hideAnimated(el, ()=>el.close());
});



// helper functions

function toOptions(input, defaults) {
    const options = typeof input === 'string'
        ? { body: htmlEntities(input).replace(/\n/g, '<br>') } // plain string: escape it
        : input;                                               // object: trusted html body
    return { lang: lang(), ...defaults, ...options };
}


function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function translate(lang, v) {
    return text[v]?.[lang] || v;
}
function lang() {
    return navigator.language.substring(0,2);
}
const text = {
    'Cancel':{
        'de':'Abbrechen',
        'fr':'Annuler',
        'es':'Cancelar',
        'it':'Annulla',
        'pt':'Cancelar',
        'ua':'Скасувати',
        'ru':'Отмена',
        'ja':'キャンセル',
        'ko':'취소',
        'zh':'取消',
        'nl':'Annuleren',
    }
}

