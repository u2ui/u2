import {tableTools} from '../tables.js';
import {Editor} from '../editor.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

const FIXTURE = '<div contenteditable style="--u2-rte-toolbar:insertTable"><p>text</p>'
    + '<table><tbody><tr><td id=a>a</td><td id=b>b</td></tr><tr><td id=c>c</td><td id=d>d</td></tr>'
    + '</tbody></table></div>';

test('table handles: appear on a cell and vanish when the caret leaves', () => withTables(
    ({surface, layer, caret}) => {
        equal(layer(), null, 'Nothing is built before a cell is entered');
        caret('#a');
        const handles = layer();
        truthy(handles);
        equal(layer().hidden, false);
        equal([...handles.querySelectorAll('button')].map(button => button.dataset.handle), [
            'rowBefore', 'rowDelete', 'rowAfter', 'columnBefore', 'columnDelete', 'columnAfter',
        ]);
        const host2 = () => layer();
        caret('p');
        equal(host2().hidden, true);
        caret('#a');
        equal(host2().hidden, false);
        surface.activate(false);
        equal(host2().hidden, true, 'Leaving the surface closes them');
    }
));

test('table handles: act on the cell the caret is in', () => withTables(({host, layer, caret}) => {
    caret('#b');
    layer().querySelector('[data-handle=columnBefore]').click();
    equal(host.querySelector('tr').innerHTML, '<td id="a">a</td><td><br></td><td id="b">b</td>');
    caret('#c');
    layer().querySelector('[data-handle=rowDelete]').click();
    equal(host.querySelectorAll('tr').length, 1);
    truthy(host.querySelector('#a'), 'The other row survives');
}));

test('table handles: a handle is disabled when its command cannot run', () => withTables(
    ({host, layer, caret}) => {
        host.querySelector('#a').colSpan = 2;
        host.querySelector('#b').remove();
        caret('#a');
        const handles = layer();
        equal(handles.querySelector('[data-handle=columnBefore]').disabled, true,
            'A spanning cell makes an index stop naming a column');
        equal(handles.querySelector('[data-handle=rowAfter]').disabled, false);
    }
));

test('table handles: pointing at one keeps the caret in its cell', () => withTables(
    ({layer, caret}) => {
        caret('#a');
        const event = new PointerEvent('pointerdown', {bubbles: true, cancelable: true});
        layer().querySelector('[data-handle=rowAfter]').dispatchEvent(event);
        truthy(event.defaultPrevented);
    }
));

test('table handles: inserting a table stays a toolbar action', () => withTables(
    ({client, surface, host, caret}) => {
        caret('p');
        const button = client.toolbar.element.querySelector('[data-command=insertTable]');
        truthy(button);
        equal(button.disabled, false);
        equal(client.commands(surface).has('rowAfter'), true, 'The command exists without a control');
        equal(client.toolbar.element.querySelector('[data-command=rowAfter]'), null);
        button.click();
        equal(host.querySelectorAll('table').length, 2);
    }
));

test('table handles: the layer is released with the module', () => withTables(({client, layer}) => {
    client.delete('tables');
    equal(layer(), null);
}));

function withTables(run) {
    return withFixture(FIXTURE, root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        try {
            client.add(tableTools());
            const host = root.firstElementChild;
            const surface = core.add(host);
            const caret = selector => {
                const node = host.querySelector(selector);
                getSelection().collapse(node.firstChild || node, 0);
                core.sync();
                surface.capture();
            };
            const layer = () => client.chrome.root.getElementById('tables');
            return run({caret, client, core, host, layer, surface});
        } finally {
            client.dispose();
            core.dispose();
        }
    });
}
