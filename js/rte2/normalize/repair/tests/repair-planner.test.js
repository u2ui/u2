import {ContentModel} from '../../../model/content-model.js';
import {RepairPlanner} from '../repair-planner.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('repair planner: validates its root, policy, level, and direct children', () => withFixture(
    '<div><p>text</p></div>', root => {
        const host = root.firstElementChild;
        const planner = new RepairPlanner(host);
        throws(() => new RepairPlanner(document), TypeError);
        throws(() => new RepairPlanner(host, {model: {}}), TypeError);
        throws(() => new RepairPlanner(host, {block: ''}), TypeError);
        throws(() => new RepairPlanner(host, {level: 'deep'}), TypeError);
        throws(() => new RepairPlanner(host, {generic: 'div'}), TypeError);
        throws(() => planner.plan(host, document.createElement('p')), RangeError);
    }
));

test('repair planner: valid content stays unchanged and planning is pure', () => withFixture(
    '<div><p>text</p></div>', root => {
        const host = root.firstElementChild;
        const paragraph = host.firstElementChild;
        const html = host.innerHTML;
        const plan = new RepairPlanner(host, {block: 'p'}).plan(host, paragraph);
        equal(plan, {type: 'keep'});
        truthy(Object.isFrozen(plan));
        equal(host.innerHTML, html);
    }
));

test('repair planner: nested editables are isolation boundaries', () => withFixture(
    '<div><section contenteditable><p>nested</p></section></div>', root => {
        const host = root.firstElementChild;
        equal(new RepairPlanner(host, {block: 'p'}).plan(host, host.firstElementChild), {type: 'boundary'});
    }
));

test('repair planner: structural root content uses the configured block', () => withFixture(
    '<div>text<span>inline</span><br></div>', root => {
        const host = root.firstElementChild;
        const planner = new RepairPlanner(host, {block: 'p'});
        for (const child of host.childNodes) equal(planner.plan(host, child), {type: 'wrap', tag: 'p'});
    }
));

test('repair planner: ignorable root nodes are removed instead of wrapped', () => withFixture(
    '<div>   <!--note--><p>text</p></div>', root => {
        const host = root.firstElementChild;
        const planner = new RepairPlanner(host, {block: 'p'});
        equal(planner.plan(host, host.childNodes[0]), {type: 'remove'});
        equal(planner.plan(host, host.childNodes[1]), {type: 'remove'});
    }
));

test('repair planner: neutral generic text blocks convert to the root block', () => withFixture(
    '<section><div>hello <strong>world</strong></div></section>', root => {
        const host = root.firstElementChild;
        equal(new RepairPlanner(host, {block: 'p'}).plan(host, host.firstElementChild), {type: 'convert', tag: 'p'});
    }
));

test('repair planner: redundant generic wrappers around blocks unwrap', () => withFixture(
    '<section><div><p>one</p> <p>two</p></div></section>', root => {
        const host = root.firstElementChild;
        equal(new RepairPlanner(host, {block: 'p'}).plan(host, host.firstElementChild), {type: 'unwrap', breaks: false});
    }
));

test('repair planner: meaningful generic wrappers remain intact when valid', () => withFixture(
    '<section><div class=layout>hello</div></section>', root => {
        const host = root.firstElementChild;
        equal(new RepairPlanner(host, {block: 'p'}).plan(host, host.firstElementChild), {type: 'keep'});
    }
));

test('repair planner: structural parents wrap invalid children in their default child', () => withFixture(
    '<ul></ul>', root => {
        const list = root.firstElementChild;
        const paragraph = document.createElement('p');
        paragraph.textContent = 'text';
        list.append(paragraph);
        equal(new RepairPlanner(list, {block: 'li'}).plan(list, paragraph), {type: 'wrap', tag: 'li'});
    }
));

test('repair planner: neutral invalid wrappers unwrap when all children fit', () => withFixture(
    '<div><p id=parent></p></div>', root => {
        const host = root.firstElementChild;
        const paragraph = root.querySelector('#parent');
        const div = document.createElement('div');
        div.textContent = 'text';
        paragraph.append(div);
        equal(new RepairPlanner(host, {block: 'p'}).plan(paragraph, div), {type: 'unwrap', breaks: true});
    }
));

test('repair planner: meaningful invalid content lifts to a safe ancestor', () => withFixture(
    '<div><p id=parent>before</p></div>', root => {
        const host = root.firstElementChild;
        const paragraph = root.querySelector('#parent');
        const section = document.createElement('section');
        section.className = 'meaningful';
        section.textContent = 'block';
        paragraph.append(section);
        const plan = new RepairPlanner(host, {block: 'p'}).plan(paragraph, section);
        equal(plan.type, 'lift');
        same(plan.target, host);
    }
));

test('repair planner: cleanup levels separate validity from root shaping', () => withFixture(
    '<div>text</div>', root => {
        const host = root.firstElementChild;
        const text = host.firstChild;
        equal(new RepairPlanner(host, {block: 'p', level: 'none'}).plan(host, text), {type: 'keep'});
        equal(new RepairPlanner(host, {block: 'p', level: 'minimal'}).plan(host, text), {type: 'keep'});
        equal(new RepairPlanner(host, {block: 'p', level: 'structural'}).plan(host, text), {type: 'wrap', tag: 'p'});
    }
));

test('repair planner: custom default-child rules stay model-driven', () => withFixture(
    '<x-list><p>text</p></x-list>', root => {
        const list = root.firstElementChild;
        const model = new ContentModel({rules: {
            'x-list': {children: ['x-item'], defaultChild: 'x-item'},
            'x-item': {children: ['@flow']},
            p: {groups: ['flow'], children: ['@flow']},
        }});
        const plan = new RepairPlanner(list, {model, level: 'minimal'}).plan(list, list.firstElementChild);
        equal(plan, {type: 'wrap', tag: 'x-item'});
    }
));

test('repair planner: unknown lossless repairs are rejected', () => withFixture(
    '<p></p>', root => {
        const host = root.firstElementChild;
        const horizontalRule = document.createElement('hr');
        host.append(horizontalRule);
        equal(new RepairPlanner(host, {block: null}).plan(host, horizontalRule), {type: 'reject'});
    }
));
