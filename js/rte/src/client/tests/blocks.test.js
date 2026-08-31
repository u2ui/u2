import {blocks, blockStyles, defaultBlockStyles} from '../blocks.js';
import {Editor} from '../editor.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('block styles client module: binds mixed values and configurable custom styles', () => withFixture(
    '<div contenteditable style="--u2-rte-toolbar:block"><h1>one</h1><p class=keep>two</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        same(client.add(blocks), client);
        const surface = core.add(root.firstElementChild);
        const first = surface.element.firstElementChild.firstChild;
        const last = surface.element.lastElementChild.firstChild;
        getSelection().setBaseAndExtent(first, 0, last, 3);
        core.sync();
        let select = client.toolbar.element.querySelector('[data-control=block]');
        truthy(select);
        equal(select.value, '', 'A mixed block selection must show no single value');
        select.value = 'h2';
        select.dispatchEvent(new Event('change', {bubbles: true}));
        equal(surface.element.innerHTML, '<h2>one</h2><h2 class="keep">two</h2>');
        equal(select.value, 'h2');
        same(getSelection().anchorNode, first);
        equal(getSelection().anchorOffset, 0);
        same(getSelection().focusNode, last);
        equal(getSelection().focusOffset, 3);

        client.delete(blocks);
        const custom = blockStyles([...defaultBlockStyles, {
            name: 'lead',
            label: 'Lead',
            selector: 'p.lead',
            tag: 'p',
            write: element => element.classList.add('lead'),
            clear: element => element.classList.remove('lead'),
        }]);
        client.add(custom);
        select = client.toolbar.element.querySelector('[data-control=block]');
        truthy(select.querySelector('[value="lead"]'));
        select.value = 'lead';
        select.dispatchEvent(new Event('change', {bubbles: true}));
        equal(surface.element.innerHTML, '<p class="lead">one</p><p class="keep lead">two</p>');
        client.dispose();
        core.dispose();
    }
));

test('block styles client module: validates module identity options', () => {
    throws(() => blockStyles(defaultBlockStyles, {name: ''}), TypeError);
    throws(() => blockStyles(defaultBlockStyles, {control: null}), TypeError);
    throws(() => blockStyles(defaultBlockStyles, {command: ''}), TypeError);
    throws(() => blockStyles(defaultBlockStyles, {label: ''}), TypeError);
});

test('block styles client module: CSS element policy filters values on demand', () => withFixture(
    '<div contenteditable style="--u2-rte-toolbar:block; --u2-rte-elements:p h1 strong br"><p>text</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const client = new Editor(core);
        client.add(blocks);
        const surface = core.add(root.firstElementChild);
        getSelection().collapse(surface.element.firstElementChild.firstChild, 2);
        core.sync();
        const select = client.toolbar.element.querySelector('[data-control=block]');
        equal(select.querySelector('[value=paragraph]').hidden, false);
        equal(select.querySelector('[value=h1]').hidden, false);
        truthy(select.querySelector('[value=h2]').hidden);
        truthy(select.querySelector('[value=h3]').hidden);

        surface.element.style.setProperty('--u2-rte-elements', 'p h2 strong br');
        client.refresh();
        truthy(select.querySelector('[value=h1]').hidden);
        equal(select.querySelector('[value=h2]').hidden, false);
        client.dispose();
        core.dispose();
    }
));
