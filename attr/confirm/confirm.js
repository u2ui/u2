
let resentConfirmed = false;

// submit
document.addEventListener('submit', e=>{
    if (resentConfirmed) return; // dont check again
    const form = e.target;
    const btn = e.submitter;
    let element = null;
    if (form.hasAttribute('u1-confirm')) element = form;
    if (btn && btn.hasAttribute('u1-confirm')) element = btn;
    if (!element) return;
    confirmEvent(e, element, ()=> form.requestSubmit(btn) );
},true);

// click
document.addEventListener('click', e=>{
    if (resentConfirmed) return;
    const element = e.target.closest('button[u1-confirm]');
    if (!element) return;
    if (element.form && element.type==='submit') return; // handled by submit event. What about "reset"?
    confirmEvent(e, element, ()=> element.click() );
},true);

async function confirmEvent(e, element, then){
    e.preventDefault();
    e.stopImmediatePropagation();
    const {confirm} = await import('../../js/dialog/dialog.js');
    const lang = langOf(element);
    const ok = await confirm({
        body: getMessage(element, lang),
        lang,
    });
    if (ok) {
        resentConfirmed = true;
        then();
        resentConfirmed = false;
    }
}

function getMessage(el, lang) {
    // get lang of el
    let msg = el.getAttribute('u1-confirm');
    if (msg) return msg;
    msg = sure[lang];
    if (msg) return msg;
    console.warn('no translation for lang "'+lang+'" in confirm.js. Please report!');
    return sure.en;
}

function langOf(el) {
    return el.closest('[lang]')?.getAttribute('lang') || navigator.language.substring(0,2) || 'en';
}

const sure = {
    en: 'Are you sure?',
    de: 'Sind Sie sicher?',
    fr: 'Êtes-vous sûr?',
    es: '¿Estás seguro?',
    it: 'Sei sicuro?',
    pt: 'Tem certeza?',
    ua: 'Ви впевнені?',
    ru: 'Вы уверены?',
    ja: '本気ですか？',
    ko: '확실합니까?',
    zh: '你确定吗？',
    nl: 'Weet je het zeker?',
};


/* TODO: button and link confirm?
document.addEventListener('click', async e=>{
    if (resentConfirmed) return;
    let element = e.target.closest('[u1-confirm]');
    if (!element) return;
    if (element.form || element.tagName === 'FORM') {
        console.log('handled by submit event');
        return;
    }
    confirmEvent(e, element, ()=>
        element.click()
    );
},true);
*/
