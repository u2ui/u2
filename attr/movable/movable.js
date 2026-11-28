import { PointerObserver } from '../../js/PointerObserver/PointerObserver.js';


function getInitialState(element, method) {
    if (method === 'transform') {
        const transform = getComputedStyle(element).transform;
        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            return { x: matrix.m41, y: matrix.m42 };
        }
        return { x: 0, y: 0 };
    }
    return {
        x: parseFloat(element.style.left) || 0,
        y: parseFloat(element.style.top) || 0
    };
}

function applyPosition(element, method, initialState, deltaX, deltaY) {
    const newX = initialState.x + deltaX;
    const newY = initialState.y + deltaY;

    if (method === 'transform') {
        element.style.transform = `translate(${newX}px, ${newY}px)`;
    } else {
        if (!element.style.position || element.style.position === 'static') element.style.position = 'relative';
        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
    }
}

function handleStart(e) {
    const path = e.composedPath();
    const target = path.find(el => el.hasAttribute?.('u2-movable'));
    if (!target) return;

    let handler = path.find(el => el.hasAttribute?.('u2-movable-handler'));

    if (handler) {
        //if (handler.closest('[u2-movable]') !== target) return;
        const handlerIndex = path.indexOf(handler);
        const targetIndex = path.indexOf(target);
        if (handlerIndex > targetIndex) return;
    } else {
        //if (target.querySelector('[u2-movable-handler]')) return;
        if (findOwnHandler(target)) return;
        handler = target;
    }

    const styles = getComputedStyle(target);
    const threshold = parseFloat(styles.getPropertyValue('--u2-movable-threshold')) || 10;
    const method = styles.getPropertyValue('--u2-movable-method').trim() || 'transform';
    const xEnabled = styles.getPropertyValue('--u2-movable-x').trim() !== 'false';
    const yEnabled = styles.getPropertyValue('--u2-movable-y').trim() !== 'false';

    const initialState = getInitialState(target, method);

    // todo: every start creates a new observer that watches mouse and touch.
    // that is not good at all, maybe PointerObserver should not take an element
    const observer = new PointerObserver(handler, {
        mouse: true,
        touch: true,
        passive: false
    });
    // hack:
    handler.removeEventListener('mousedown', observer.start);
    handler.removeEventListener('touchstart', observer.start, { passive: true });

    observer.onstart = (e) => e.preventDefault();

    observer.onmove = () => {
        const {x, y} = observer.startDiff;
        if (Math.hypot(x, y) < threshold) return;
        applyPosition(target, method, initialState, xEnabled ? x : 0, yEnabled ? y : 0);
    };

    observer.onstop = () => {
        console.log('stop');
    };

    observer.start(e);
}

document.addEventListener('mousedown', handleStart);
document.addEventListener('touchstart', handleStart, { passive: true });




function findOwnHandler(root) {
    function walk(node) {
        if (node !== root && node.hasAttribute?.('u2-movable')) return null;
        if (node.hasAttribute?.('u2-movable-handler')) return node;
        for (const child of node.children) {
            const found = walk(child);
            if (found) return found;
        }
        return node.shadowRoot ? walk(node.shadowRoot) : null;
    }
    return walk(root);
}