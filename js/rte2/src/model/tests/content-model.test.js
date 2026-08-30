import {ContentModel} from '../content-model.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

const model = new ContentModel({
    fallback: {groups: ['flow'], children: ['@flow']},
    rules: {
        box: {groups: ['flow'], children: ['@flow'], block: true, defaultChild: 'line'},
        line: {groups: ['flow'], children: ['@phrasing'], textBlock: true},
        mark: {groups: ['flow', 'phrasing'], children: ['@phrasing']},
        'x-link': {groups: ['flow', 'phrasing'], transparent: true, exclude: ['x-link']},
        atom: {groups: ['flow', 'phrasing'], atomic: true},
        break: {groups: ['flow', 'phrasing'], void: true},
    },
});

test('content model: classifies tags, elements, text, and unknown nodes', () => withFixture(
    '<box><mark>text</mark><unknown></unknown><!--comment--></box>', root => {
        const box = root.firstElementChild;
        truthy(model.is(box, 'flow'));
        truthy(model.is(box, 'FLOW'));
        truthy(model.block('BOX'));
        truthy(model.textBlock('line'));
        truthy(model.block('line'), 'Text blocks are blocks by definition');
        truthy(model.mergeable('line'), 'Text blocks are mergeable by default');
        equal(model.textBlock(box), false);
        equal(model.mergeable(box), false);
        equal(model.rule(box).defaultChild, 'line');
        truthy(model.is(box.firstElementChild.firstChild, 'phrasing'));
        truthy(model.is(box.querySelector('unknown'), 'flow'));
        equal(model.groups(box.lastChild), []);
    }
));

test('content model: matches exact tags, text, wildcards, and groups', () => withFixture(
    '<box><mark>text</mark></box>', root => {
        const box = root.firstElementChild;
        const mark = box.firstElementChild;
        truthy(model.allows(box, mark));
        truthy(model.allows(mark, mark.firstChild));
        equal(model.allows(mark, box), false);
        const exact = new ContentModel({rules: {one: {children: ['two', '#text']}, two: {}, three: {children: ['*']}}});
        const one = document.createElement('one');
        truthy(exact.allows(one, document.createElement('two')));
        truthy(exact.allows(one, document.createTextNode('x')));
        equal(exact.allows(one, document.createElement('three')), false);
        truthy(exact.allows(document.createElement('three'), document.createComment('x')) === false);
    }
));

test('content model: transparent content inherits its concrete DOM context', () => withFixture(
    '<line><x-link id=inside></x-link></line><box><x-link id=outside></x-link></box>', root => {
        const inside = root.querySelector('#inside');
        const outside = root.querySelector('#outside');
        equal(model.allows(inside, document.createElement('box')), false);
        truthy(model.allows(inside, document.createElement('mark')));
        truthy(model.allows(outside, document.createElement('box')));
        equal(model.allows('x-link', document.createElement('mark')), false);
    }
));

test('content model: ancestor exclusions cross transparent wrappers', () => withFixture(
    '<box><x-link id=outer><mark><x-link id=inner></x-link></mark></x-link></box>', root => {
        const outer = root.querySelector('#outer');
        const mark = outer.firstElementChild;
        equal(model.allows(mark, root.querySelector('#inner')), false);
        truthy(model.allows(mark, document.createElement('atom')));
    }
));

test('content model: distinguishes atomic, void, and ordinary content', () => {
    truthy(model.atomic('atom'));
    truthy(model.atomic('break'));
    equal(model.atomic('mark'), false);
    truthy(model.transparent('x-link'));
});

test('content model: dynamic rules may decide or defer', () => withFixture(
    '<box></box>', root => {
        const dynamic = new ContentModel({rules: {
            box: {
                children: ['mark'],
                allow: (_parent, child) => child.hasAttribute?.('data-allow') || undefined,
            },
            mark: {},
            other: {},
        }});
        const box = root.firstElementChild;
        const other = document.createElement('other');
        other.dataset.allow = '';
        truthy(dynamic.allows(box, other));
        truthy(dynamic.allows(box, document.createElement('mark')));
        equal(dynamic.allows(box, document.createElement('other')), false);
    }
));

test('content model: extension is isolated and merges individual rules', () => withFixture(
    '<box><atom></atom><mark></mark></box>', root => {
        const box = root.firstElementChild;
        const extended = model.extend({rules: {
            box: {children: ['atom']},
            mark: null,
        }});
        truthy(extended.block(box));
        truthy(extended.allows(box, box.firstElementChild));
        equal(extended.allows(box, box.lastElementChild), false);
        truthy(model.allows(box, box.lastElementChild));
        truthy(extended.is(box.lastElementChild, 'flow'));
        truthy(model.is(box.lastElementChild, 'phrasing'));
        truthy(model.extend({rules: {box: {textBlock: true}}}).mergeable(box),
            'Text-block defaults must survive rule extension');
        equal(model.extend({rules: {line: {textBlock: false}}}).mergeable('line'), false);
    }
));

test('content model: an element allowlist narrows structure without losing parent rules', () => withFixture(
    '<box><line>text</line><mark>other</mark></box>', root => {
        const box = root.firstElementChild;
        const narrowed = model.extend({elements: ['line']});
        equal(narrowed.elements, ['line']);
        truthy(Object.isFrozen(narrowed.elements));
        truthy(narrowed.allowed('line'));
        equal(narrowed.allowed(box.lastElementChild), false);
        truthy(narrowed.allowed(box.firstElementChild.firstChild), 'Text remains governed by the parent rule');
        truthy(narrowed.allows(box, box.firstElementChild), 'The host may provide context without being output content');
        equal(narrowed.allows(box, box.lastElementChild), false);
        truthy(model.allowed(box.lastElementChild));
        truthy(narrowed.extend({elements: null}).allows(box, box.lastElementChild));
        same(model.withElements(['line']), model.withElements(['line']), 'Equivalent configured models are reused');
    }
));

test('content model: validates rule names and list values', () => {
    throws(() => new ContentModel({rules: {'': {}}}), TypeError);
    throws(() => new ContentModel({rules: {box: {groups: 'flow'}}}), TypeError);
    throws(() => new ContentModel({rules: {box: {children: [1]}}}), TypeError);
    throws(() => new ContentModel({rules: {box: {allow: true}}}), TypeError);
    throws(() => new ContentModel({fallback: null}), TypeError);
    throws(() => new ContentModel({elements: 'box'}), TypeError);
    throws(() => new ContentModel({elements: ['']}), TypeError);
    throws(() => model.is('box', ''), TypeError);
});
