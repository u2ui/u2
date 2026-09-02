import {equal, test, truthy} from '../../tests/harness.js';

test('playground: boots with the invalid nested-block scenario intact', () => withPlayground(document => {
    const editor = document.querySelector('#editor');
    truthy(editor);
    equal(editor.localName, 'div');
    equal(editor.firstElementChild.localName, 'p');
    equal(editor.firstElementChild.firstElementChild.localName, 'div');
    truthy(document.querySelector('#tree').textContent.includes('<div>'));
}));

test('playground: analysis is pure and normalization exposes its actions', () => withPlayground(document => {
    const editor = document.querySelector('#editor');
    const before = editor.innerHTML;
    document.querySelector('#analyze').click();
    equal(editor.innerHTML, before);
    truthy(document.querySelector('#log').textContent.includes('unwrap'));
    document.querySelector('#normalize').click();
    equal(editor.innerHTML, '<p>test<br> abc</p><p>hallo</p>');
    truthy(document.querySelector('#status').textContent.includes('stable: true'));
}));

test('playground: one step maps and restores a live selection', () => withPlayground(document => {
    const editor = document.querySelector('#editor');
    const text = editor.firstElementChild.firstElementChild.firstChild;
    const range = document.createRange();
    range.setStart(text, 1);
    range.setEnd(text, 3);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
    document.querySelector('#step').click();
    equal(document.getSelection().toString(), 'es');
    equal(editor.innerHTML, '<p>test<br> abc</p><div>hallo</div>');
    truthy(document.querySelector('#status').textContent.includes('stable: false'));
}));

test('playground: the DOM tree marks anchor and focus at their exact positions', () => withPlayground(document => {
    const editor = document.querySelector('#editor');
    const text = editor.firstElementChild.firstElementChild.firstChild;
    document.getSelection().setBaseAndExtent(text, 1, text, 3);
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const tree = document.querySelector('#tree');
    equal(tree.querySelector('[data-position=anchor]').textContent, '┃');
    equal(tree.querySelector('[data-position=focus]').textContent, '┃');
    truthy(tree.textContent.includes('#text "t┃es┃t"'));
    truthy(tree.textContent.includes('anchor: div/p[0]/div[0]/#text[0] @ 1'));
    truthy(tree.textContent.includes('focus:  div/p[0]/div[0]/#text[0] @ 3'));
}));

test('playground: host-specific list defaults can be inspected and executed', () => withPlayground(document => {
    const scenario = document.querySelector('#scenario');
    scenario.value = 'list';
    scenario.dispatchEvent(new document.defaultView.Event('change'));
    document.querySelector('#normalize').click();
    const editor = document.querySelector('#editor');
    equal(editor.localName, 'ul');
    equal(editor.contentEditable, 'true');
    equal(editor.innerHTML, '<li><p>one</p></li><li><p>two</p></li>');
    equal(document.querySelector('#block').value, 'auto');
}));

test('playground: synthetic input runs through the installed input pipeline', () => withPlayground(document => {
    const scenario = document.querySelector('#scenario');
    scenario.value = 'generic';
    scenario.dispatchEvent(new document.defaultView.Event('change'));
    document.querySelector('#input-type').value = 'insertText';
    document.querySelector('#dispatch-input').click();
    equal(document.querySelector('#editor').innerHTML, '<p>hello <em>world</em></p>');
    truthy(document.querySelector('#log').textContent.includes('convert'));
}));

test('playground: a prevented input type runs its registered command', () => withPlayground(document => {
    const scenario = document.querySelector('#scenario');
    scenario.value = 'blocks';
    scenario.dispatchEvent(new document.defaultView.Event('change'));
    const editor = document.querySelector('#editor');
    const range = document.createRange();
    range.setStart(editor.querySelector('p').firstChild, 1);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
    document.querySelector('#input-type').value = 'insertParagraph';
    document.querySelector('#dispatch-input').click();
    equal(editor.innerHTML, '<div><p>o</p><p>ne</p><p>two</p></div>',
        'Cleanup after a command stays in the scope the command touched');
    truthy(document.querySelector('#status').textContent.includes('command enter'));
}));

test('playground: the explicit editor installs structural Backspace', () => withPlayground(document => {
    const editor = document.querySelector('#editor');
    editor.innerHTML = '<ul><li><br></li><li><br></li></ul>';
    document.getSelection().collapse(editor.querySelector('li:last-child'), 1);
    const input = new document.defaultView.InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'deleteContentBackward',
    });
    editor.dispatchEvent(input);
    truthy(input.defaultPrevented);
    equal(editor.innerHTML, '<ul><li><br></li></ul>');
}));

test('playground: the one-import prototype lazily handles Enter inside a list', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    equal(chrome(document).getElementById('toolbar'), null,
        'No toolbar exists before the first surface is active');
    const text = editor.querySelector('li').firstChild;
    document.getSelection().collapse(text, 4);
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const input = new document.defaultView.InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertParagraph',
    });
    editor.dispatchEvent(input);
    truthy(input.defaultPrevented);
    equal(editor.querySelector('ul').firstElementChild.outerHTML, '<li>List</li>');
    equal(editor.querySelector('ul').children[1].outerHTML, '<li> item</li>');
    truthy(chrome(document).getElementById('toolbar'));
}));

test('playground: the optional block module exposes a value control', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    const text = editor.querySelector('p').firstChild;
    document.getSelection().collapse(text, 4);
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const select = chrome(document).querySelector('#toolbar [data-control=block]');
    truthy(select);
    equal(select.value, 'paragraph');
    select.value = 'h1';
    select.dispatchEvent(new document.defaultView.Event('change', {bubbles: true}));
    equal(editor.firstElementChild.localName, 'h1');
    equal(select.value, 'h1');
    truthy(document.getSelection().isCollapsed);
}));

test('playground: the optional break marker is visible without changing HTML', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    const before = editor.innerHTML;
    const text = editor.firstElementChild.firstChild;
    document.getSelection().collapse(text, 4);
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const button = chrome(document).querySelector('#toolbar [data-command=showBreaks]');
    truthy(button);
    equal(button.getAttribute('aria-pressed'), 'true');
    truthy(editor.hasAttribute('data-u2-rte-breaks'));
    const marker = document.querySelector('[data-u2-rte-break-marker]');
    truthy(marker);
    equal(marker.hidden, false);
    truthy(marker.style.left.endsWith('px'));
    truthy(marker.style.top.endsWith('px'));
    button.click();
    equal(button.getAttribute('aria-pressed'), 'false');
    equal(editor.hasAttribute('data-u2-rte-breaks'), false);
    equal(document.querySelector('[data-u2-rte-break-marker]'), null);
    equal(editor.innerHTML, before);
}));

test('playground: optional Unstyle advances through visible formatting levels', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    const strong = editor.querySelector('.pasted strong');
    const paragraph = strong.closest('p');
    const span = strong.parentElement;
    const text = strong.firstChild;
    document.getSelection().setBaseAndExtent(text, 0, text, text.length);
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const button = chrome(document).querySelector('#toolbar [data-control=unstyle]');
    truthy(button);
    equal(button.disabled, false);
    button.click();
    equal(span.outerHTML, '<span class="pasted"><strong>Select this paste-like formatting</strong></span>');
    button.click();
    equal(paragraph.innerHTML, '<strong>Select this paste-like formatting</strong> and click T× repeatedly.');
    button.click();
    equal(paragraph.innerHTML, 'Select this paste-like formatting and click T× repeatedly.');
    equal(button.disabled, true);
}));

test('playground: class-mark controls reuse inline elements and remove neutral spans', () => withPlayground(document => {
    const scenario = document.querySelector('#scenario');
    scenario.value = 'marks';
    scenario.dispatchEvent(new document.defaultView.Event('change'));
    const editor = document.querySelector('#editor');
    const toolbar = document.querySelector('#toolbar');
    equal(toolbar.hidden, false);
    equal(toolbar.getAttribute('role'), 'toolbar');
    equal(document.querySelector('#mark-toggle').ariaPressed, 'false');
    document.querySelector('#mark-apply').click();
    equal(editor.innerHTML, '<li>he<span class="x">llo</span></li><li><b class="x">dear</b> world</li>');
    truthy(document.querySelector('#status').textContent.includes('Applied .x'));
    const toggle = document.querySelector('#mark-toggle');
    equal(toggle.ariaPressed, 'true');
    const marked = editor.querySelector('span').firstChild;
    document.getSelection().collapse(marked, 1);
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    equal(toggle.ariaPressed, 'true', 'A caret inside the mark keeps its active state');
    equal(toggle.disabled, false, 'Pending marks make caret toggle available');
    document.getSelection().setBaseAndExtent(marked, 0, editor.querySelector('b').firstChild, 4);
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    document.querySelector('#mark-remove').click();
    equal(editor.innerHTML, '<li>hello</li><li><b>dear</b> world</li>');
    truthy(document.querySelector('#status').textContent.includes('Removed .x'));
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusout', {
        bubbles: true,
        composed: true,
        relatedTarget: document.querySelector('#analyze'),
    }));
    equal(toolbar.hidden, true, 'The explicit integration ends the session with the focus');
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    equal(toolbar.hidden, true, 'And a selection alone does not start a new one');
}));

test('playground: class-mark toggle reflects and changes selection state', () => withPlayground(document => {
    const scenario = document.querySelector('#scenario');
    scenario.value = 'marks';
    scenario.dispatchEvent(new document.defaultView.Event('change'));
    const editor = document.querySelector('#editor');
    const toggle = document.querySelector('#mark-toggle');
    toggle.click();
    equal(editor.innerHTML, '<li>he<span class="x">llo</span></li><li><b class="x">dear</b> world</li>');
    equal(toggle.ariaPressed, 'true');
    toggle.click();
    equal(editor.innerHTML, '<li>hello</li><li><b>dear</b> world</li>');
    equal(toggle.ariaPressed, 'false');
}));

test('playground: bold uses semantic aliases, canonical HTML, and semantic removal', () => withPlayground(document => {
    const scenario = document.querySelector('#scenario');
    scenario.value = 'marks';
    scenario.dispatchEvent(new document.defaultView.Event('change'));
    const editor = document.querySelector('#editor');
    const toggle = document.querySelector('#bold-toggle');
    equal(toggle.ariaPressed, 'mixed');
    toggle.click();
    equal(editor.innerHTML, '<li>he<strong>llo</strong></li><li><b>dear</b> world</li>');
    equal(toggle.ariaPressed, 'true');
    toggle.click();
    equal(editor.innerHTML, '<li>hello</li><li>dear world</li>');
    equal(toggle.ariaPressed, 'false');
}));

test('playground: bold shortcut formats the next text input at a caret', () => withPlayground(document => {
    const scenario = document.querySelector('#scenario');
    scenario.value = 'marks';
    scenario.dispatchEvent(new document.defaultView.Event('change'));
    const editor = document.querySelector('#editor');
    document.getSelection().collapse(editor.children[0].firstChild, 2);
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const shortcut = new document.defaultView.KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        key: 'b',
    });
    editor.dispatchEvent(shortcut);
    truthy(shortcut.defaultPrevented);
    const input = new document.defaultView.InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: 'B',
    });
    editor.dispatchEvent(input);
    truthy(input.defaultPrevented);
    equal(editor.innerHTML, '<li>he<strong>B</strong>llo</li><li><b>dear</b> world</li>');
}));

test('playground: caret toggle formats the next text input', () => withPlayground(document => {
    const scenario = document.querySelector('#scenario');
    scenario.value = 'marks';
    scenario.dispatchEvent(new document.defaultView.Event('change'));
    const editor = document.querySelector('#editor');
    const text = editor.children[0].firstChild;
    document.getSelection().collapse(text, 2);
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const toggle = document.querySelector('#mark-toggle');
    equal(toggle.disabled, false);
    toggle.click();
    const event = new document.defaultView.InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: 'x',
    });
    editor.dispatchEvent(event);
    truthy(event.defaultPrevented);
    equal(editor.innerHTML, '<li>he<span class="x">x</span>llo</li><li><b>dear</b> world</li>');
}));

test('playground: the prototype toolbar offers the structure controls', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    const paragraph = [...editor.querySelectorAll('p')].find(node => node.textContent.startsWith('Turn these'));
    document.getSelection().collapse(paragraph.firstChild, 1);
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const toolbar = chrome(document).getElementById('toolbar');
    for (const name of ['undo', 'redo', 'italic', 'bullets', 'numbers', 'indent', 'outdent', 'rule', 'source', 'editLink']) {
        truthy(toolbar.querySelector(`[data-command=${name}]`), `The prototype offers ${name}`);
    }
    const bullets = toolbar.querySelector('[data-command=bullets]');
    equal(bullets.disabled, false);
    equal(bullets.getAttribute('aria-pressed'), 'false');
    bullets.click();
    // The new item joins the list directly above it instead of starting a
    // second list of the same kind.
    equal(editor.querySelectorAll('ul').length, 1);
    equal(editor.querySelector('ul').lastElementChild.textContent,
        'Turn these paragraphs into a list, then lift them out again.');
    equal(bullets.getAttribute('aria-pressed'), 'true');
}));

test('playground: the style list is filled from the host declaration', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    const paragraph = [...editor.querySelectorAll('p')].find(node => node.textContent.startsWith('Select a few'));
    const text = paragraph.firstChild;
    document.getSelection().setBaseAndExtent(text, 0, text, 6);
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const select = chrome(document).querySelector('#toolbar [data-control=style]');
    equal([...select.options].slice(1).map(option => option.value), ['lead', 'caption', 'brandColor']);
    equal(select.hidden, false);
}));

test('playground: an image frames itself when clicked', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    const image = editor.querySelector('img');
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    image.dispatchEvent(new document.defaultView.MouseEvent('click', {bubbles: true, composed: true}));
    const frame = chrome(document).getElementById('images');
    equal(frame.hidden, false);
    equal([...frame.querySelectorAll('button')].map(handle => handle.dataset.handle),
        ['se', 'e', 's']);
}));

test('playground: table handles appear on the table and act on its cell', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    const paragraph = [...editor.querySelectorAll('p')].find(node => node.textContent.startsWith('Select a few'));
    document.getSelection().collapse(paragraph.firstChild, 2);
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const handles = chrome(document).getElementById('tables');
    truthy(!handles || handles.hidden, 'Outside a table there is nothing to act on');

    const cell = editor.querySelector('td');
    document.getSelection().collapse(cell.firstChild, 3);
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    const layer = chrome(document).getElementById('tables');
    equal(layer.hidden, false);
    const rows = editor.querySelectorAll('tr').length;
    layer.querySelector('[data-handle=rowAfter]').click();
    equal(editor.querySelectorAll('tr').length, rows + 1);
}));

// The panel is built from the modules themselves, so it cannot drift from what
// the editor actually offers.
test('playground: the host panel configures the surface live', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    const boxes = [...document.querySelectorAll('#toolbar-controls input')];
    truthy(boxes.length > 5);
    truthy(boxes.some(box => box.value === 'bold' && box.checked));

    const paragraph = editor.querySelector('p');
    const text = paragraph.firstChild;
    document.getSelection().setBaseAndExtent(text, 0, text, 6);
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    truthy(chrome(document).querySelector('[data-command=bold]:not([hidden])'));

    const bold = boxes.find(box => box.value === 'bold');
    bold.checked = false;
    bold.dispatchEvent(new document.defaultView.Event('change', {bubbles: true}));
    truthy(editor.style.getPropertyValue('--u2-rte-toolbar').length);
    equal(editor.style.getPropertyValue('--u2-rte-toolbar').includes('bold'), false);
    equal(chrome(document).querySelector('[data-command=bold]').hidden, true,
        'A control the host stops listing is gone at once');

    const when = [...document.querySelectorAll('#host-properties select')]
        .find(select => select.previousSibling.textContent.includes('toolbar-when'));
    when.value = 'selection';
    when.dispatchEvent(new document.defaultView.Event('change', {bubbles: true}));
    equal(editor.style.getPropertyValue('--u2-rte-toolbar-when'), 'selection');
}));

test('playground: the prototype reports its history state', () => withPlayground(document => {
    const editor = document.querySelector('#editor-prototype');
    const readout = document.querySelector('#history-state');
    equal(readout.textContent, 'History: focus the surface to start recording.');
    const paragraph = editor.querySelector('p');
    document.getSelection().collapse(paragraph.firstChild, 1);
    editor.dispatchEvent(new document.defaultView.FocusEvent('focusin', {bubbles: true, composed: true}));
    document.dispatchEvent(new document.defaultView.Event('selectionchange'));
    truthy(readout.textContent.includes('1 entries, at 1'), readout.textContent);
    chrome(document).querySelector('#toolbar [data-command=rule]').click();
    truthy(readout.textContent.includes('at 2'), readout.textContent);
    truthy(readout.textContent.includes('undo'), readout.textContent);
}));

// Everything the editor draws lives in one shadow root of its own.
function chrome(document) {
    return document.querySelector('[data-u2-rte-chrome=editor]').shadowRoot;
}

async function withPlayground(run) {
    const frame = document.createElement('iframe');
    frame.src = '../playground/';
    frame.title = 'RTE playground test';
    frame.style.cssText = 'position:fixed;inset-inline-start:-100vw;width:800px;height:600px';
    document.body.append(frame);
    try {
        await new Promise((resolve, reject) => {
            frame.addEventListener('load', resolve, {once: true});
            frame.addEventListener('error', () => reject(new Error('Playground failed to load')), {once: true});
        });
        return await run(frame.contentDocument);
    } finally {
        frame.remove();
    }
}
