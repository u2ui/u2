
/* prevent double-click selection */
addEventListener('mousedown', e => {
    if (e.detail < 2) return; // // check event.ctrlKey/event.shiftKey/event.altKey?
    let target = e.composedPath()[0]; // shadow dom
    if (!target.closest('summary,label')) return;
    e.preventDefault();
});


/*

Copy styles to the shadow-dom
- add functionality to a custom Element Class we can inherit?

new SelectorObserver({
    on: el => {
        for (let ss of document.styleSheets) el.shadowRoot.append(ss.ownerNode.cloneNode());
    } ,
}).observe('[deep-css]');

*/



/*

Add classes on running transitions
- does this take up too much performance?

addEventListener('transitionstart',e=>{
    e.target.classList.add('u2-animating')
})
addEventListener('transitionend',e=>{
    e.target.classList.remove('u2-animating')
})

*/