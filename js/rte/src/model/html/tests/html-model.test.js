import {createHtmlModel, htmlModel} from '../html-model.js';
import {equal, test, truthy, withFixture} from '../../../../tests/harness.js';

test('html model: generic blocks accept flow while paragraphs accept phrasing', () => withFixture(
    '<div><p><span>text</span></p></div>', root => {
        const div = root.firstElementChild;
        const paragraph = div.firstElementChild;
        truthy(htmlModel.allows(div, paragraph));
        truthy(htmlModel.allows(paragraph, paragraph.firstElementChild));
        truthy(htmlModel.allows(paragraph, paragraph.textContent && paragraph.firstElementChild.firstChild));
        equal(htmlModel.allows(paragraph, document.createElement('div')), false);
        truthy(htmlModel.block(paragraph));
        truthy(htmlModel.block(div));
        truthy(htmlModel.textBlock(paragraph));
        truthy(htmlModel.textBlock(document.createElement('h1')));
        equal(htmlModel.textBlock(div), false);
        truthy(htmlModel.mergeable(paragraph));
        truthy(htmlModel.mergeable(document.createElement('li')));
        equal(htmlModel.mergeable(div), false);
    }
));

test('html model: lists and definition lists enforce structural children', () => withFixture(
    '<ul><li>one</li></ul><dl><dt>term</dt><dd>description</dd></dl>', root => {
        const list = root.firstElementChild;
        const dl = root.lastElementChild;
        truthy(htmlModel.allows(list, list.firstElementChild));
        equal(htmlModel.is(list.firstElementChild, 'flow'), false);
        equal(htmlModel.allows(document.createElement('div'), list.firstElementChild), false);
        equal(htmlModel.allows(list, document.createElement('p')), false);
        equal(htmlModel.allows(list, document.createTextNode('stray')), false);
        truthy(htmlModel.allows(dl, dl.firstElementChild));
        truthy(htmlModel.allows(dl, dl.lastElementChild));
        equal(htmlModel.allows(dl, document.createElement('p')), false);
    }
));

test('html model: tables expose their native parent child boundaries', () => withFixture(
    '<table><tbody><tr><td><p>cell</p></td></tr></tbody></table>', root => {
        const table = root.firstElementChild;
        const body = table.firstElementChild;
        const row = body.firstElementChild;
        const cell = row.firstElementChild;
        truthy(htmlModel.allows(table, body));
        truthy(htmlModel.allows(body, row));
        truthy(htmlModel.allows(row, cell));
        truthy(htmlModel.allows(cell, cell.firstElementChild));
        equal(htmlModel.allows(table, cell), false);
        equal(htmlModel.allows(row, document.createElement('p')), false);
        equal(htmlModel.rule(table).defaultChild, 'tbody');
        equal(htmlModel.rule(body).defaultChild, 'tr');
        equal(htmlModel.rule(row).defaultChild, 'td');
    }
));

test('html model: exclusive structural children stay contextual', () => withFixture(
    '<details><summary>title</summary><p>body</p></details><fieldset><legend>name</legend></fieldset><figure><figcaption>caption</figcaption></figure>', root => {
        const details = root.children[0];
        const fieldset = root.children[1];
        const figure = root.children[2];
        truthy(htmlModel.allows(details, details.firstElementChild));
        truthy(htmlModel.allows(fieldset, fieldset.firstElementChild));
        truthy(htmlModel.allows(figure, figure.firstElementChild));
        equal(htmlModel.allows(document.createElement('div'), details.firstElementChild), false);
        equal(htmlModel.allows(document.createElement('div'), fieldset.firstElementChild), false);
        equal(htmlModel.allows(document.createElement('div'), figure.firstElementChild), false);
    }
));

test('html model: transparent links inherit context and reject interactive descendants', () => withFixture(
    '<p><a id=inline><span></span></a></p><div><a id=flow></a></div>', root => {
        const inline = root.querySelector('#inline');
        const flow = root.querySelector('#flow');
        truthy(htmlModel.allows(inline, document.createElement('span')));
        equal(htmlModel.allows(inline, document.createElement('div')), false);
        truthy(htmlModel.allows(flow, document.createElement('div')));
        equal(htmlModel.allows(inline.firstElementChild, document.createElement('a')), false);
        equal(htmlModel.allows(inline.firstElementChild, document.createElement('button')), false);
    }
));

test('html model: custom elements are transparent to their concrete context', () => withFixture(
    '<p><x-card id=inline></x-card></p><div><x-card id=flow></x-card></div>', root => {
        const inline = root.querySelector('#inline');
        const flow = root.querySelector('#flow');
        truthy(htmlModel.is(inline, 'phrasing'));
        truthy(htmlModel.allows(inline, document.createElement('span')));
        equal(htmlModel.allows(inline, document.createElement('section')), false);
        truthy(htmlModel.allows(flow, document.createElement('section')));
    }
));

test('html model: editor atomic and void semantics are explicit', () => {
    for (const name of ['br', 'img', 'input', 'hr']) truthy(htmlModel.atomic(name));
    truthy(htmlModel.rule('br').void);
    truthy(htmlModel.rule('hr').void);
    equal(htmlModel.rule('video').void, false);
    truthy(htmlModel.atomic('video'));
    equal(htmlModel.atomic('span'), false);
});

test('html model: executable and styling nodes are not editable flow content', () => withFixture(
    '<div></div>', root => {
        const div = root.firstElementChild;
        equal(htmlModel.allows(div, document.createElement('script')), false);
        equal(htmlModel.allows(div, document.createElement('style')), false);
        equal(htmlModel.allows(div, document.createElement('template')), false);
    }
));

test('html model: application overrides do not mutate shipped defaults', () => withFixture(
    '<div><aside></aside><section></section></div>', root => {
        const div = root.firstElementChild;
        const narrowed = createHtmlModel({rules: {div: {children: ['section']}}});
        equal(narrowed.allows(div, div.firstElementChild), false);
        truthy(narrowed.allows(div, div.lastElementChild));
        truthy(htmlModel.allows(div, div.firstElementChild));
        truthy(createHtmlModel() === htmlModel);
    }
));
