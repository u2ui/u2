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
    document.querySelector('#load').click();
    document.querySelector('#normalize').click();
    const editor = document.querySelector('#editor');
    equal(editor.localName, 'ul');
    equal(editor.contentEditable, 'true');
    equal(editor.innerHTML, '<li><p>one</p></li><li><p>two</p></li>');
    equal(document.querySelector('#block').value, 'auto');
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
