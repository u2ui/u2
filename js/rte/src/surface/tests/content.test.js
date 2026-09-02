import {contentChildren, replaceContent} from '../content.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

// Editor UI normally lives outside a surface. Native top-layer isolation is the
// exception: UI that has to be a flat-tree descendant of a modal dialog ends up
// inside the content it must never become part of.
test('content: retained nodes are children but not content', () => withFixture(
    '<div contenteditable><p>one</p><p>two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const surface = core.add(root.firstElementChild);
        try {
            const ui = document.createElement('div');
            ui.dataset.ui = '';
            surface.element.append(core.retain(ui));
            equal(contentChildren(surface).length, 2);
            equal(contentChildren(surface).map(node => node.textContent).join(' '), 'one two');
            equal(surface.element.childNodes.length, 3, 'It is a child all the same');
            equal(contentChildren(surface, surface.element.firstElementChild).length, 1, 'Any parent can be asked');

            const replacement = document.createElement('p');
            replacement.textContent = 'three';
            replaceContent(surface, replacement);
            equal(contentChildren(surface).map(node => node.textContent).join(' '), 'three');
            truthy(ui.isConnected, 'Replacing the content leaves the UI where it was');
            same(surface.element.lastChild, ui, 'And keeps it behind the content');
        } finally {
            core.dispose();
        }
    }
));
