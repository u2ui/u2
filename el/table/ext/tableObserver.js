// unused, untested

function tableObserver(table) {
    const bodyCallbacks = [];
    const trCallbacks = [];
    const tdCallbacks = [];

    const observer = new MutationObserver(mutations => {
        mutations.forEach(m => m.addedNodes.forEach(handleNode));
    });

    function handleNode(node) {
        if (['TBODY', 'THEAD', 'TFOOT'].includes(node.nodeName)) {
            bodyCallbacks.forEach(cb => cb(node));
            observer.observe(node, { childList: true });
            node.childNodes.forEach(handleNode);
        } else if (node.nodeName === 'TR') {
            trCallbacks.forEach(cb => cb(node));
            observer.observe(node, { childList: true });
            node.childNodes.forEach(handleNode);
        } else if (node.nodeName === 'TD') {
            tdCallbacks.forEach(cb => cb(node));
        }
    }

    observer.observe(table, { childList: true });

    return {
        onBody(cb) { bodyCallbacks.push(cb); return this; },
        onTR(cb) { trCallbacks.push(cb); return this; },
        onTD(cb) { tdCallbacks.push(cb); return this; }
    };
}
