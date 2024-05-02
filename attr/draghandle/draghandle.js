const css = `
[u2-draghandle] {
    cursor: grab;
}
`;
document.head.insertAdjacentHTML('afterbegin', `<style>${css}</style>`);


addEventListener('mouseenter', e => {
    if (!e.target.matches('[u2-draghandle]')) return;
    const draggable = e.target.closest('[draggable]');
    if (!draggable) console.warn('u2-draghandle: no draggable parent found');
    if (draggable.getAttribute('draggable') === 'true') console.warn('u2-draghandle: draggable-attribute should be empty or false, but was true');
    draggable.setAttribute('draggable', true);
},true);

addEventListener('mouseleave', e => {
    if (!e.target.matches('[u2-draghandle]')) return;
    e.target.closest('[draggable]').setAttribute('draggable', 'false');
},true);
