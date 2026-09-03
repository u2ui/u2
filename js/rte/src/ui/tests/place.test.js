import {Rte} from '../../core/core.js';
import {Chrome} from '../chrome.js';
import {panelGap, place} from '../place.js';
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


// Two panels can answer for the same thing — an image that is also a link — and
// the second must not sit on the first.
test('place: a panel goes under the one already drawn there', () => withFixture(
    '<div contenteditable style="padding:40px"><p>text</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        const chrome = new Chrome(document, {name: 'place-test'});
        try {
            const anchor = root.firstElementChild.querySelector('p').getBoundingClientRect();
            const panels = ['first', 'second'].map(name => {
                const element = chrome.part(name, `#${name} { position: fixed; block-size: 30px; inline-size: 90px; }`);
                element.className = 'panel';
                return element;
            });
            const put = element => {
                place(element, surface, {align: 'start', prefer: 'below', gap: panelGap, on: anchor});
                return element.getBoundingClientRect();
            };
            const first = put(panels[0]);
            const second = put(panels[1]);
            equal(Math.round(second.top), Math.round(first.bottom + panelGap), 'The second goes under the first');
            panels[0].hidden = true;
            equal(Math.round(put(panels[1]).top), Math.round(first.top),
                'And takes the spot back when the first one goes');
        } finally {
            chrome.dispose();
            core.dispose();
        }
    }
));

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
