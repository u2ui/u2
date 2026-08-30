import {Unstyle, defaultUnstyle, defaultUnstyleLevels} from '../unstyle.js';
import {equal, test, throws, truthy, withFixture} from '../../../tests/harness.js';

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

test('unstyle policy: cleanup requires an explicit known strength and a DOM root', () => {
    throws(() => defaultUnstyle.clean(null, {through: 'classes'}), TypeError);
    throws(() => defaultUnstyle.clean(document.createDocumentFragment()), RangeError);
    throws(() => defaultUnstyle.clean(document.createDocumentFragment(), {through: 'unknown'}), RangeError);
});
