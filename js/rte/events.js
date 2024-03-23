import {$range} from './range.js';


export let active = null; // the active contenteditable (even if the toolbar has focus)
export let focused = null; // the focused contenteditable (not if the toolbar has focus)
export let range = null; // the current selection range
export let element = null; // the current element of the selection range

addEventListener('focusin', function(event) {
    //const target = event.target;
    const target = event.composedPath()[0];
    if (!target.isContentEditable) return;
    // to enable rte for a contenteditable element set the custom property --u2-rte to true
    if (getComputedStyle(target).getPropertyValue('--u2-rte')==='') return;

    focused = target;

    if (active===target) return; // if the active element is the same as the event target return (can be if the rte toolbar was active)

    active = target;
    target.dispatchEvent(new CustomEvent('u2-rte-activate', {bubbles:true, composed:true}));

},true);

addEventListener('focusout', function(event) {

    if (!active) return; // is there an active rte

    if (event.relatedTarget === active) return; // happens when reenters from toolbar
    
    focused = null;

    // if new focus is a part of the rte toolbar return
    if (event.relatedTarget && event.relatedTarget.closest('.u2RteTool')) return;

    // trigger a custom event u2-rte-inactive
    active.dispatchEvent(new CustomEvent('u2-rte-deactivate', {bubbles:true, composed:true}));
    active = null;

},true);

// do not add it on activate, because firefox does not fire selectionchange on fist focus
document.addEventListener('selectionchange', (event)=>{
    if (!focused) return;
    if (window.u2DomChangeIgnore) return;
    range = getSelection().getRangeAt(0);
    active.dispatchEvent(new CustomEvent('u2-rte-selectionchange', {bubbles:true, composed:true}));
});


addEventListener('u2-rte-selectionchange', function() {
    // highlight selection-range
    if (CSS.highlights) {
        const highlight = new Highlight(range);
        CSS.highlights.set('u2-rte-selection', highlight); // todo: clear on focusout?
    }

    // trigger elementchange
    let newElement = $range(range).affectedElement;
    /*
    let newElement = range.commonAncestorContainer;
    // selection is a single node (image)
    if (range.endContainer.nodeType === 1 && range.endContainer === range.startContainer && range.endOffset - range.startOffset === 1) newElement = newElement.childNodes[range.startOffset];
    if (newElement.nodeType===3) { newElement = newElement.parentElement; }
    */
    if (newElement === active) newElement = null; // active (the rte itself) element is not an editable element
    if (newElement === element) return; // no change
    element = newElement; // todo?: is not available on selectionchange bevor this event is fired
    active.dispatchEvent(new CustomEvent('u2-rte-elementchange', {bubbles:true, composed:true, detail:{element}}));
});
