import {ContentModel} from '../../../model/content-model.js';
import {RepairPlanner} from '../repair-planner.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../../tests/harness.js';

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

test('repair planner: a neutral generic wrapper around mixed root content unwraps', () => withFixture(
    '<section><div><div>one</div>two</div></section>', root => {
        const host = root.firstElementChild;
        equal(new RepairPlanner(host, {block: 'p'}).plan(host, host.firstElementChild),
            {type: 'unwrap', breaks: false});
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

test('repair planner: a root block equal to the generic wrapper is not converted into itself', () => withFixture(
    '<div><div>text</div><div><p>block</p></div></div>', root => {
        const host = root.firstElementChild;
        const planner = new RepairPlanner(host, {block: 'div'});
        equal(planner.plan(host, host.firstElementChild), {type: 'keep'});
        equal(planner.plan(host, host.lastElementChild), {type: 'unwrap', breaks: false});
    }
));

test('repair planner: a root that cannot hold its block plans no root shaping', () => withFixture(
    '<p><em>one</em> <em>two</em></p>', root => {
        const host = root.firstElementChild;
        const planner = new RepairPlanner(host, {block: 'p'});
        for (const child of host.childNodes) equal(planner.plan(host, child), {type: 'keep'});
    }
));

test('repair planner: a bare generic wrapper is redundant at any depth', () => withFixture(
    '<div><section><div><h2>a</h2></div><div>text</div><div id=keep><p>b</p></div></section></div>', root => {
        const host = root.firstElementChild;
        const planner = new RepairPlanner(host, {block: 'p'});
        const section = host.firstElementChild;
        const [blocks, text, kept] = section.children;
        equal(planner.plan(section, blocks).type, 'unwrap');
        equal(planner.plan(section, text), {type: 'convert', tag: 'p'});
        equal(planner.plan(section, kept).type, 'keep', 'An attribute makes a wrapper deliberate');
    }
));

test('repair planner: canonical removes meaningless inline wrappers that are valid', () => withFixture(
    '<div><p><span>a</span><span class=x>b</span><span></span><em>c</em></p></div>', root => {
        const host = root.firstElementChild;
        const paragraph = host.firstElementChild;
        const [bare, marked, empty, semantic] = paragraph.children;
        const structural = new RepairPlanner(host, {block: 'p'});
        const canonical = new RepairPlanner(host, {block: 'p', level: 'canonical'});
        equal(structural.plan(paragraph, bare).type, 'keep');
        equal(canonical.plan(paragraph, bare).type, 'unwrap');
        equal(canonical.plan(paragraph, marked).type, 'keep', 'An attribute carries meaning');
        equal(canonical.plan(paragraph, empty).type, 'remove');
        equal(canonical.plan(paragraph, semantic).type, 'keep', 'A semantic element is not noise');
    }
));

test('repair planner: loose inline content beside blocks gets the default block', () => withFixture(
    '<div><div id=mixed><p>a</p>loose<em>text</em></div><li>loose in a list item</li></div>', root => {
        const host = root.firstElementChild;
        const planner = new RepairPlanner(host, {block: 'p'});
        const mixed = host.querySelector('#mixed');
        const item = host.querySelector('li');
        equal(planner.plan(mixed, mixed.childNodes[1]), {type: 'wrap', tag: 'p'});
        equal(planner.plan(mixed, mixed.querySelector('em')), {type: 'wrap', tag: 'p'});
        equal(planner.plan(mixed, mixed.firstElementChild).type, 'keep');
        equal(planner.plan(item, item.firstChild).type, 'keep',
            'A list item carries its own meaning and keeps loose text');
    }
));
