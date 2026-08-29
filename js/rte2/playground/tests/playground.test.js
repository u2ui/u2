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

async function withPlayground(run) {
    const frame = document.createElement('iframe');
    frame.src = '../playground/';
    frame.title = 'RTE2 playground test';
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
