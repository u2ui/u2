// TODO: 
// - should we move the dom inside shadowDom to avoid style conflicts?
//  or should we add an option to use shadowDom or just to define the container for the dialog-element?
// - rename to modal.js? see <iframe sandbox="allow-modals">

class Dialog {
    constructor(options) {

        const element = this.element = d.createElement('dialog');
        element.classList.add('u2x-modal');
        //element.setAttribute('role','alertdialog'); // todo: internals.role = 'alertdialog'; ?
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
                    btn.then && btn.then.call(this,e);
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
        d.body.appendChild(element);
        element.showModal();
        if (this.options.audio) {
            const url = this.options.audio === true ? import.meta.url + '/../notification.mp3' : this.options.audio;
            const audio = new Audio();
            audio.volume = 0.2;
            audio.src = url;
            audio.play();            
        }

        return new Promise((resolve, reject)=>{
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
export function alert(text) {
    const options = toOptions(text);
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
export function confirm(text) {
    const options = toOptions(text);
    options.buttons = [
        {title: 'OK',then(){ dialog.value = true; } },
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
export function prompt(text, initial) {
    const options = toOptions(text);
    options.body = '<label>'+options.body+'<input style="width:100%;display:block;margin-top:.5rem"></label>';
    options.buttons = [
        {title: 'OK', then(){ dialog.value = input.value; } },
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
export function form(html){
    if (typeof html === 'string') html = { body: html };
    const options = toOptions(html);
    options.buttons = 
        [{title:'OK',then(){ // TODO: triggers by click but would be better by form.submit?
            const form = dialog.element.querySelector('form');
            if (!form.checkValidity()) dialog.value = null;
            else {
                const data = Object.fromEntries(new FormData(form).entries());
                dialog.value = data;
            }
        }},{title: translate(lang(), 'Cancel'), type:'button', then(){
            dialog.element.close();
        }}];

    const dialog = new Dialog(options);
    return dialog.show();
}
/* */


/* init */
const d = document;

d.head.insertAdjacentHTML(
    'afterbegin',
    '<style>'+
    '.u2x-modal .-buttons {'+
        'display:flex;'+
        'flex-wrap:wrap;'+
        'justify-content:flex-end;'+
        'gap:.5rem;'+
        'margin-top:1rem;'+
    '}'+
    '</style>'
);



// close dialog on backdrop-click if it has the backdropClose-class
addEventListener('click', event=>{
    const el = event.target;
    if (el.tagName !== 'DIALOG') return;
    if (!el.classList.contains('backdropClose')) return;
    const rect = el.getBoundingClientRect();
    let isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
    if (isInDialog) return;
    el.close();
    //hideAnimated(el, ()=>el.close());
});



// helper functions

function toOptions(options) {
    if (typeof options === 'string') {
        options = { body: htmlEntities(options) };
    }
    options.lang ??= lang();
    return options;
}


function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function translate(lang, v) {
    return text[v][lang] || v;
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


/* 

Works! Waiting for demand
There are standards on the way that allow animations (@starting-style, transition-behavior: allow-discrete;)

needs css:
dialog.animated[hidden] {
    display:block !important;
    pointer-events:none !important;
}

function hideAnimated(el, then) {
    if (!el.classList.contains('animated')) {
        then();
        return;
    }
    el.style.animation = 'none'; // animation can be the same in reverse, so remove it first to avoid it not triggering
    setTimeout(()=>{
        el.style.animation = '';
        const end = e=>{
            if (e && e.type && e.target !== el) return;
            el.hidden = false;
            then && then();
            el.removeEventListener('animationend',end);
            el.removeEventListener('transitionend',end);
            clearTimeout(timeout);
            return;
        }
        el.addEventListener('animationend',end);
        el.addEventListener('transitionend',end);
        const timeout = setTimeout(end,2000);
        el.hidden = true;
    });

};
addEventListener('cancel', e=>{
    if (e.defaultPrevented) return;
    const el = e.target;
    if (el.hidden) return;
    if (!el.classList.contains('animated')) return;
    e.preventDefault();
    hideAnimated(el, ()=>el.close());
}, true)
addEventListener('submit', e=>{
    if (e.defaultPrevented) return;
    const form = e.target;
    if (form.method!=='dialog') return;
    const el = el.closest('.dialog');
    if (el.hidden) return;
    if (!el.classList.contains('animated')) return;
    e.preventDefault();
    hideAnimated(el, ()=>form.submit());
}, true)
/* */
