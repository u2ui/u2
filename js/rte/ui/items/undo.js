const histories = new Map();
let active = null;
let ignoreChanges = false;

// add to history
function addToHistory(target) {
    if (ignoreChanges) return;
    histories.has(target) || histories.set(target, {items:[]});
    const history = histories.get(target);
    const html = target.innerHTML;

    // compare with last
    const last = history.items[history.items.length-1];
    if (last && last.html === html) return;

    // remove history after current
    if (history.current != null) {
        history.items.splice(history.current+1);
        history.current = null;
    }
    
    const selection = saveSelectionWithinElement(target);
    history.items.push({
        html: target.innerHTML,
        selection: selection,
        time: Date.now()
    });
}

// debounce
const addToHistoryDebounced = debounce(addToHistory, 500, 800);

const mutationObserver = new MutationObserver(()=>{
    if (ignoreChanges) return;
    addToHistoryDebounced(active);
});

addEventListener('u2-rte-activate', function(e) {
    active = e.target;
    setTimeout(() => addToHistoryDebounced.force(e.target))  // it has not yet the selection
    mutationObserver.observe(e.target, {subtree:true, attributes:true, characterData:true});
});
addEventListener('u2-rte-deactivate', function(e) {
    addToHistoryDebounced.force(e.target);
    mutationObserver.disconnect();
});


function undo() {
    const history = histories.get(active);
    history.current ??= history.items.length - 1;
    if (history.current <= 0) return;
    history.current--;
    patchItem(active, history.items[history.current]);
}
function redo() {
    const history = histories.get(active);
    if (history.current > history.items.length) return;
    history.current++;
    patchItem(active, history.items[history.current]);
}
function patchItem(target, item) {
    if (!item) return;
    ignoreChanges = true;
    target.innerHTML = item.html;
    setTimeout(()=>restoreSelectionWithinElement(item.selection, target));
    setTimeout(()=>ignoreChanges = false, 100);
}
function hasUndo() {
    const history = histories.get(active);
    const count = history.items.length;
    return count && (history.current??count > 1);
}
function hasRedo() {
    const history = histories.get(active);
    return history.current !== undefined && history.current < history.items.length - 1;
}


Rte.ui.setItem('Undo', {
    icon:'undo', 
    click:undo, 
    check:hasUndo, 
    shortcut:'z',
    labels:{
        de: 'Rückgängig',
        en: 'Undo',
        fr: 'Annuler',
    }
});
Rte.ui.setItem('Redo', {
    icon:'redo', 
    click:redo, 
    check:hasRedo, 
    shortcut:'y',
    labels:{
        de: 'Wiederholen',
        en: 'Redo',
        fr: 'Refaire',
    } 
});



function getXPathForElement(element, rootElement) {
    if (element === rootElement) {
        return ".";
    } else if (element.nodeType === 3) { // Textknoten
        const textNodes = Array.from(element.parentNode.childNodes).filter(node => node.nodeType === 3);
        const idx = textNodes.indexOf(element);
        return `${getXPathForElement(element.parentNode, rootElement)}/text()[${idx + 1}]`;
    } else { // Elementknoten
        const siblings = Array.from(element.parentNode.children);
        const idx = siblings.indexOf(element);
        const tagName = element.tagName.toLowerCase();
        return `${getXPathForElement(element.parentNode, rootElement)}/${tagName}[${idx + 1}]`;
    }
}

function getElementByXPath(xpath, contextElement) {
    const result = document.evaluate(xpath, contextElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
}

function saveSelectionWithinElement(element) {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        return {
            startPath: getXPathForElement(range.startContainer, element),
            startOffset: range.startOffset,
            endPath: getXPathForElement(range.endContainer, element),
            endOffset: range.endOffset
        };
    }
    return null;
}

function restoreSelectionWithinElement(saved, element) {
    const startNode = getElementByXPath(saved.startPath, element);
    const endNode = getElementByXPath(saved.endPath, element);
    if (startNode && endNode) {
        const range = document.createRange();
        range.setStart(startNode, saved.startOffset);
        range.setEnd(endNode, saved.endOffset);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}


function debounce(fn, min, max) {
    let timeoutMin = null;
    let timeoutMax = null;
    let lastInvocationTime = null;
    const debouncedFn = function(...args) {
        const invoke = () => {
            fn(...args);
            lastInvocationTime = Date.now();
            clearTimeout(timeoutMax);
            timeoutMax = null;
        };
        const now = Date.now();
        if (lastInvocationTime && (now - lastInvocationTime < max)) {
            clearTimeout(timeoutMin);
            timeoutMin = setTimeout(invoke, min);
        } else {
            if (!timeoutMax) {
                timeoutMax = setTimeout(invoke, max);
            }
        }
    };
    debouncedFn.force = function(...args) {
        clearTimeout(timeoutMin);
        clearTimeout(timeoutMax);
        fn(...args);
        lastInvocationTime = Date.now();
    };
    return debouncedFn;
}
