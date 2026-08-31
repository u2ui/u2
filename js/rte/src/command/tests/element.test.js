import {Commands} from '../commands.js';
import {elementAttributes, selectedElement} from '../element.js';
import {Edit} from '../edit.js';
import {Rte} from '../../core/core.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('element attributes: validate their names', () => {
    throws(() => elementAttributes([]), TypeError);
    throws(() => elementAttributes('width'), TypeError);
    truthy(elementAttributes(['width']).run);
});

test('element attributes: a selection covering one element addresses it', () => withElement(
    '<div contenteditable><p>one<img id=a src=/a.png>two</p></div>', ({host, surface}) => {
        const image = host.querySelector('#a');
        const paragraph = host.querySelector('p');
        select(image);
        same(selectedElement(new Edit(surface)), image);
        getSelection().setBaseAndExtent(paragraph.firstChild, 0, paragraph.lastChild, 3);
        equal(selectedElement(new Edit(surface)), null, 'More than one node is not one element');
        getSelection().collapse(paragraph.firstChild, 1);
        equal(selectedElement(new Edit(surface)), null, 'A caret covers nothing');
    }
));

test('element attributes: a match narrows what may be addressed', () => withElement(
    '<div contenteditable><p><img id=a src=/a.png><br></p></div>', ({host, surface}) => {
        const match = element => element.matches('img');
        select(host.querySelector('#a'));
        truthy(selectedElement(new Edit(surface), match));
        select(host.querySelector('br'));
        equal(selectedElement(new Edit(surface), match), null);
    }
));

test('element attributes: values are written, read back, and cleared', () => withElement(
    '<div contenteditable><p><img id=a src=/a.png></p></div>', ({commands, host}) => {
        const image = host.querySelector('#a');
        select(image);
        equal(commands.state('size'), {});
        equal(commands.enabled('size'), true);
        commands.run('size', {value: {width: 320, height: 200}});
        equal(image.outerHTML, '<img id="a" src="/a.png" width="320" height="200">');
        equal(commands.state('size'), {width: '320', height: '200'});
        commands.run('size');
        equal(image.outerHTML, '<img id="a" src="/a.png">', 'No value clears them');
        equal(commands.state('size'), {});
    }
));

test('element attributes: the element stays selected so its UI stays up', () => withElement(
    '<div contenteditable><p><img id=a src=/a.png></p></div>', ({commands, host, surface}) => {
        const image = host.querySelector('#a');
        select(image);
        commands.run('size', {value: {width: 100}});
        same(selectedElement(new Edit(surface)), image);
    }
));

test('element attributes: nothing selected means nothing to run', () => withElement(
    '<div contenteditable><p>text</p></div>', ({commands, host}) => {
        getSelection().collapse(host.querySelector('p').firstChild, 2);
        equal(commands.enabled('size'), false);
        equal(commands.state('size'), null);
        equal(commands.run('size', {value: {width: 10}}), undefined);
    }
));

function select(element) {
    const range = document.createRange();
    range.selectNode(element);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
}

function withElement(html, run) {
    return withFixture(html, root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const surface = core.add(host);
        const commands = new Commands(surface, {commands: {
            size: elementAttributes(['width', 'height'], {match: element => element.matches('img')}),
        }});
        try {
            return run({commands, core, host, surface});
        } finally {
            core.dispose();
        }
    });
}
