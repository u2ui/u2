// When a contextual UI is drawn, for every module that draws one. It follows the
// selection and the content of one surface, comes back with the session and goes
// with it — coming back to the selection it was already showing for is no
// selection change, so only the session's return says it belongs on screen again.
//
// What to draw is the module's own business; this only says when.
export function follows(surface, draw, close) {
    const controller = new surface.element.ownerDocument.defaultView.AbortController();
    const listen = {signal: controller.signal};
    // Only while the surface has a session. A selection is not one: engines leave a selection inside
    // an editable nobody focused — clicking beside one does that — and the core captures it before
    // it decides that no session follows. Drawing on that capture would put a form on a caret the
    // keyboard cannot reach, which is exactly what the toolbar already refuses to do.
    const drawing = () => surface.active && draw();
    for (const type of ['u2-rte-selectionchange', 'u2-rte-change', 'u2-rte-activate']) {
        surface.addEventListener(type, drawing, listen);
    }
    surface.addEventListener('u2-rte-deactivate', close, listen);
    return {
        // A module with more of its own to hear ends it with the same signal.
        signal: controller.signal,
        dispose() {
            controller.abort();
            close();
        },
    };
}
