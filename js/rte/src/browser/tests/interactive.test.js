import {activatingAround, interactiveAround} from '../interactive.js';
import {equal, same, test, withFixture} from '../../../tests/harness.js';

// What surrounds an editing host, never what it holds: a link in the content is
// content, and what a press does to that one is the editor's own business.
test('interactive: what an editing host sits in', () => withFixture(`
    <a id=link href="#docs">before <span id=wrapped contenteditable>text</span> after</a>
    <button id=button contenteditable>label</button>
    <div id=plain contenteditable>text <a id=inner href="#inner">link</a></div>
`, root => {
    const wrapped = root.querySelector('#wrapped');
    const plain = root.querySelector('#plain');
    same(interactiveAround(wrapped), root.querySelector('#link'));
    same(interactiveAround(root.querySelector('#button')), root.querySelector('#button'), 'A host that is one itself');
    equal(interactiveAround(plain), null, 'A link the content holds is content');
    equal(interactiveAround(null), null);

    same(activatingAround(root.querySelector('#button')), root.querySelector('#button'));
    equal(activatingAround(wrapped), null, 'A link is followed, not activated by a key');
    equal(activatingAround(plain), null);
}));
