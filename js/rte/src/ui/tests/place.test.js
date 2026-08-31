import {Rte} from '../../core/core.js';
import {place} from '../place.js';
import {equal, test, truthy, withFixture} from '../../../tests/harness.js';

test('place: reports when a surface has no saved selection', () => withPlaced(({surface, panel}) => {
    equal(place(panel, surface), false);
    equal(panel.style.top, '');
}));

test('place: anchors on the saved selection and stays inside the viewport', () => withPlaced(
    ({surface, panel}) => {
        const text = surface.element.firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 4);
        surface.capture();
        truthy(place(panel, surface));
        const top = parseFloat(panel.style.top);
        const left = parseFloat(panel.style.left);
        truthy(top >= 8 && top + panel.offsetHeight <= innerHeight);
        truthy(left >= 8 && left + panel.offsetWidth <= innerWidth);
    }
));

test('place: falls to the other side when the preferred one does not fit', () => withPlaced(
    ({surface, panel}) => {
        const text = surface.element.firstChild;
        getSelection().setBaseAndExtent(text, 0, text, 4);
        surface.capture();
        place(panel, surface, {prefer: 'above'});
        const above = parseFloat(panel.style.top);
        place(panel, surface, {prefer: 'below'});
        const below = parseFloat(panel.style.top);
        truthy(below > above, 'The two preferences resolve to different sides');
    }
));

test('place: alignment chooses the anchor edge', () => withPlaced(({surface, panel}) => {
    const text = surface.element.firstChild;
    getSelection().setBaseAndExtent(text, 0, text, 4);
    surface.capture();
    place(panel, surface, {align: 'start'});
    const start = parseFloat(panel.style.left);
    place(panel, surface, {align: 'center'});
    truthy(parseFloat(panel.style.left) !== start || start === 8);
}));

function withPlaced(run) {
    return withFixture('<div contenteditable style="position:fixed; top:40vh; left:20vw">one two</div>', root => {
        const core = new Rte(document, {auto: false});
        const panel = document.createElement('div');
        panel.style.cssText = 'position:fixed; inline-size:12rem; block-size:3rem';
        document.body.append(panel);
        try {
            return run({core, panel, surface: core.add(root.firstElementChild)});
        } finally {
            panel.remove();
            core.dispose();
        }
    });
}
