import {Unstyle, defaultUnstyle, defaultUnstyleLevels} from '../unstyle.js';
import {PointMap} from '../../selection/map/point-map.js';
import {Point} from '../../selection/point/point.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('unstyle policy: validates and freezes ordered levels', () => {
    throws(() => new Unstyle([]), TypeError);
    throws(() => new Unstyle([{}]), TypeError);
    throws(() => new Unstyle([{name: 'empty'}]), TypeError);
    throws(() => new Unstyle([{name: 'bad', attributes: 'class'}]), TypeError);
    throws(() => new Unstyle([{name: 'bad', elements: ['p div']}]), TypeError);
    throws(() => new Unstyle([
        {name: 'same', attributes: ['class']},
        {name: 'same', attributes: ['style']},
    ]), RangeError);
    equal(defaultUnstyle.levels.map(level => level.name), ['classes', 'styles', 'attributes', 'formatting']);
    equal(defaultUnstyleLevels, defaultUnstyle.levels);
    truthy(Object.isFrozen(defaultUnstyle));
    truthy(Object.isFrozen(defaultUnstyle.levels));
    truthy(Object.isFrozen(defaultUnstyle.levels[0].attributes));
});

test('unstyle policy: detached cleanup applies every level through the requested one', () => withFixture(`
    <div id=source><p class=layout style="color:red" align=center><strong class=heavy>text</strong></p></div>
`, root => {
    const source = root.querySelector('#source');
    const fragment = document.createDocumentFragment();
    fragment.append(...source.childNodes);
    const changed = defaultUnstyle.clean(fragment, {through: 'styles'});
    equal(fragment.firstElementChild.outerHTML, '<p align="center"><strong>text</strong></p>');
    equal(changed.length, 2);
    defaultUnstyle.clean(fragment, {through: 'formatting'});
    equal(fragment.firstElementChild.outerHTML, '<p>text</p>');
}));

test('unstyle policy: custom levels work on an element root', () => withFixture(
    '<section><mark data-tone=warm>text</mark></section>', root => {
        const policy = new Unstyle([
            {name: 'data', attributes: ['data-tone']},
            {name: 'wrapper', elements: ['mark']},
        ]);
        const mark = root.querySelector('mark');
        policy.clean(mark, {through: 'data'});
        equal(mark.outerHTML, '<mark>text</mark>');
        policy.clean(mark, {through: 'wrapper'});
        equal(root.innerHTML, '<section>text</section>');
    }
));

test('unstyle policy: live cleanup maps unwrapped boundaries and touches its transaction', () => withFixture(
    '<section><span class=foreign>text</span></section>', root => {
        const section = root.firstElementChild;
        const span = section.firstElementChild;
        const point = new Point(span, 1);
        const map = new PointMap([point]);
        const touched = [];
        const transaction = {touch(node) { touched.push(node); return this; }};
        defaultUnstyle.clean(span, {through: 'styles', map, transaction});
        equal(section.innerHTML, 'text');
        same(map.get(point).node, section);
        equal(map.get(point).offset, 1);
        truthy(touched.includes(section));
    }
));

test('unstyle policy: preserved elements keep their own presentation inside cleaned roots', () => withFixture(
    '<section><span class=foreign><em class=kept style="color:red">old</em><b class=foreign>new</b></span></section>',
    root => {
        const section = root.firstElementChild;
        const existing = section.querySelector('em');
        defaultUnstyle.clean(section, {through: 'formatting', preserve: new Set([existing])});
        equal(section.innerHTML, '<em class="kept" style="color:red">old</em>new');
    }
));

test('unstyle policy: cleanup requires an explicit known strength and a DOM root', () => {
    throws(() => defaultUnstyle.clean(null, {through: 'classes'}), TypeError);
    throws(() => defaultUnstyle.clean(document.createDocumentFragment()), RangeError);
    throws(() => defaultUnstyle.clean(document.createDocumentFragment(), {through: 'unknown'}), RangeError);
    throws(() => defaultUnstyle.clean(document.createDocumentFragment(), {through: 'styles', map: {}}), TypeError);
    throws(() => defaultUnstyle.clean(document.createDocumentFragment(), {through: 'styles', transaction: {}}), TypeError);
    throws(() => defaultUnstyle.clean(document.createDocumentFragment(), {through: 'styles', preserve: {}}), TypeError);
});

test('unstyle: declared content classes survive the class level', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p class="lead pasted" style="color:red">a</p><span class="pasted">b</span>';
    defaultUnstyle.clean(root, {through: 'classes', keep: ['lead']});
    equal(root.innerHTML, '<p class="lead" style="color:red">a</p>b');
});

test('unstyle: without a keep list the class attribute goes entirely', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p class="lead pasted">a</p>';
    defaultUnstyle.clean(root, {through: 'classes'});
    equal(root.innerHTML, '<p>a</p>');
});

test('unstyle: an element carrying only declared classes is left alone', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span class="lead">a</span>';
    equal(defaultUnstyle.clean(root, {through: 'classes', keep: ['lead']}).length, 0);
    equal(root.innerHTML, '<span class="lead">a</span>');
});

test('unstyle: a wrapper carrying a declared class survives formatting removal', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span class="lead">a</span><span class="pasted">b</span><b>c</b>';
    defaultUnstyle.clean(root, {through: 'formatting', keep: ['lead']});
    equal(root.innerHTML, '<span class="lead">a</span>bc');
});
