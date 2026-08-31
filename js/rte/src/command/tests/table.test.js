import {Commands} from '../commands.js';
import {Rte} from '../../core/core.js';
import {Tables} from '../table.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

const GRID = '<div contenteditable><table><tbody>'
    + '<tr><td id=a>a</td><td id=b>b</td></tr>'
    + '<tr><td id=c>c</td><td id=d>d</td></tr>'
    + '</tbody></table></div>';

test('tables: validate their tag and expose one command per action', () => {
    throws(() => new Tables(''), TypeError);
    const tables = new Tables();
    equal(tables.tag, 'table');
    equal(Object.keys(tables.commands).sort(), [
        'columnAfter', 'columnBefore', 'columnDelete', 'deleteTable',
        'insertTable', 'rowAfter', 'rowBefore', 'rowDelete',
    ]);
});

test('tables: a table is inserted at the caret with the caret in its first cell', () => withTables(
    '<div contenteditable><p>onetwo</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().collapse(text, 3);
        equal(commands.enabled('insertTable'), true);
        commands.run('insertTable', {value: {rows: 2, columns: 3}});
        equal(host.querySelectorAll('tr').length, 2);
        equal(host.querySelectorAll('td').length, 6);
        equal(host.firstElementChild.outerHTML, '<p>one</p>');
        same(getSelection().anchorNode, host.querySelector('td'));
        equal(commands.enabled('insertTable'), false, 'A table does not nest by accident');
    }
));

test('tables: a selection inserts at its start and keeps its content', () => withTables(
    '<div contenteditable><p>onetwo</p></div>', ({commands, host}) => {
        const text = host.querySelector('p').firstChild;
        getSelection().setBaseAndExtent(text, 3, text, 6);
        equal(commands.enabled('insertTable'), true, 'A toolbar shown only for a selection needs this');
        commands.run('insertTable', {value: {rows: 1, columns: 1}});
        equal(host.firstElementChild.outerHTML, '<p>one</p>');
        equal(host.lastElementChild.outerHTML, '<p>two</p>');
    }
));

test('tables: rows are added above and below the caret row', () => withTables(GRID, ({commands, host}) => {
    getSelection().collapse(host.querySelector('#a').firstChild, 1);
    commands.run('rowAfter');
    equal(host.querySelectorAll('tr').length, 3);
    equal(host.querySelectorAll('tr')[1].outerHTML, '<tr><td><br></td><td><br></td></tr>');
    same(getSelection().anchorNode, host.querySelectorAll('tr')[1].firstElementChild);
    getSelection().collapse(host.querySelector('#a').firstChild, 1);
    commands.run('rowBefore');
    equal(host.querySelectorAll('tr').length, 4);
    equal(host.querySelector('tr').outerHTML, '<tr><td><br></td><td><br></td></tr>');
}));

test('tables: deleting a row keeps the caret in the same column', () => withTables(GRID, ({commands, host}) => {
    getSelection().collapse(host.querySelector('#b').firstChild, 1);
    commands.run('rowDelete');
    equal(host.querySelectorAll('tr').length, 1);
    same(getSelection().anchorNode, host.querySelector('#d'));
    commands.run('rowDelete');
    equal(host.querySelector('table'), null, 'The last row takes the table with it');
}));

test('tables: columns are added on both sides of the caret cell', () => withTables(GRID, ({commands, host}) => {
    getSelection().collapse(host.querySelector('#b').firstChild, 1);
    commands.run('columnBefore');
    equal(host.querySelector('tr').innerHTML, '<td id="a">a</td><td><br></td><td id="b">b</td>');
    equal(host.querySelectorAll('tr')[1].innerHTML, '<td id="c">c</td><td><br></td><td id="d">d</td>');
    same(getSelection().anchorNode, host.querySelector('tr').children[1]);
    getSelection().collapse(host.querySelector('#d').firstChild, 1);
    commands.run('columnAfter');
    equal(host.querySelectorAll('td').length, 8);
}));

test('tables: deleting a column takes it from every row', () => withTables(GRID, ({commands, host}) => {
    getSelection().collapse(host.querySelector('#b').firstChild, 1);
    commands.run('columnDelete');
    equal(host.querySelector('table').textContent, 'ac');
    same(getSelection().anchorNode, host.querySelector('#a'));
    commands.run('columnDelete');
    equal(host.querySelector('table'), null, 'The last column takes the table with it');
}));

test('tables: the whole table can be removed and leaves a usable caret', () => withTables(
    `<div contenteditable><p>one</p>${GRID.slice(GRID.indexOf('<table'), GRID.lastIndexOf('</div>'))}<p>two</p></div>`,
    ({commands, host}) => {
        getSelection().collapse(host.querySelector('#a').firstChild, 1);
        equal(commands.enabled('deleteTable'), true);
        commands.run('deleteTable');
        equal(host.innerHTML, '<p>one</p><p>two</p>');
        equal(getSelection().anchorOffset, 1);
        equal(commands.enabled('deleteTable'), false);
    }
));

// An index no longer names a column once a cell spans several, so the commands
// that count on one stay unavailable instead of shifting the wrong cells.
test('tables: spanning cells make the counted actions unavailable', () => withTables(
    '<div contenteditable><table><tbody><tr><td id=a colspan=2>a</td></tr>'
    + '<tr><td>b</td><td>c</td></tr></tbody></table></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('#a').firstChild, 1);
        equal(commands.enabled('columnBefore'), false);
        equal(commands.enabled('columnDelete'), false);
        equal(commands.enabled('rowAfter'), true, 'A row is still a row');
        equal(commands.enabled('deleteTable'), true);
    }
));

test('tables: a header cell keeps its kind when its row or column grows', () => withTables(
    '<div contenteditable><table><thead><tr><th id=h>H</th></tr></thead>'
    + '<tbody><tr><td id=x>x</td></tr></tbody></table></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('#h').firstChild, 1);
        commands.run('rowAfter');
        equal(host.querySelector('thead').innerHTML, '<tr><th id="h">H</th></tr><tr><th><br></th></tr>');
        getSelection().collapse(host.querySelector('#h').firstChild, 1);
        commands.run('columnAfter');
        equal(host.querySelector('thead tr').innerHTML, '<th id="h">H</th><th><br></th>');
        equal(host.querySelector('tbody tr').innerHTML, '<td id="x">x</td><td><br></td>');
    }
));

test('tables: nothing is available outside a table', () => withTables(
    '<div contenteditable><p>text</p></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('p').firstChild, 2);
        for (const name of ['rowBefore', 'rowAfter', 'rowDelete', 'columnBefore', 'columnAfter',
            'columnDelete', 'deleteTable']) {
            equal(commands.enabled(name), false, `${name} needs a table`);
        }
        equal(commands.enabled('insertTable'), true);
    }
));

test('tables: a host that forbids tables offers nothing', () => withTables(
    '<div contenteditable style="--u2-rte-elements: p"><p>text</p></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('p').firstChild, 2);
        equal(commands.enabled('insertTable'), false);
    }
));

function withTables(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const commands = new Commands(surface, {commands: new Tables().commands});
        try {
            return run({commands, core, host, surface});
        } finally {
            core.dispose();
        }
    });
}
