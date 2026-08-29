import {Mark, MarkType} from '../mark.js';
import {equal, same, test, throws, truthy} from '../../../tests/harness.js';

test('marks: validate and expose immutable type policy', () => {
    const type = new MarkType(' color ', {rank: 20, excludes: ['color', 'highlight', 'color']});
    equal(type.name, 'color');
    equal(type.rank, 20);
    equal(type.exclusions, ['color', 'highlight']);
    truthy(Object.isFrozen(type.exclusions));
    throws(() => new MarkType(''), TypeError);
    throws(() => new MarkType('color', {rank: Infinity}), TypeError);
    throws(() => new MarkType('color', {excludes: 'color'}), TypeError);
    throws(() => new MarkType('color', {excludes: ['']}), TypeError);
});

test('marks: snapshot serializable values and compare their meaning', () => {
    const link = new MarkType('link');
    const source = {title: 'Docs', href: '/docs', flags: ['external']};
    const one = link.create(source);
    const two = link.create({flags: ['external'], href: '/docs', title: 'Docs'});
    source.href = '/changed';
    equal(one.value, {flags: ['external'], href: '/docs', title: 'Docs'});
    truthy(Object.isFrozen(one));
    truthy(Object.isFrozen(one.value));
    truthy(Object.isFrozen(one.value.flags));
    truthy(one.equals(two), 'Object key order must not change mark equivalence');
    equal(one.equals(link.create({href: '/other'})), false);
    equal(one.equals(new MarkType('link').create(one.value)), false, 'Types are isolated by identity');
});

test('marks: reject values that cannot form stable editor state', () => {
    const type = new MarkType('custom');
    throws(() => type.create(undefined), TypeError);
    throws(() => type.create(NaN), TypeError);
    throws(() => type.create(new Date()), TypeError);
    throws(() => type.create(() => {}), TypeError);
    throws(() => type.create(Array(1)), TypeError);
    throws(() => type.create({[Symbol('private')]: true}), TypeError);
    const cyclic = {};
    cyclic.self = cyclic;
    throws(() => type.create(cyclic), TypeError);
    throws(() => new Mark(null), TypeError);
});

test('marks: same-type values conflict by default and custom exclusions compose', () => {
    const color = new MarkType('color');
    const note = new MarkType('note', {excludes: []});
    const reset = new MarkType('reset', {excludes: ['*']});
    truthy(color.create('red').conflicts(color.create('blue')));
    equal(color.create('red').conflicts(note.create()), false);
    truthy(reset.create().conflicts(note.create()));
    throws(() => color.excludes(null), TypeError);
    throws(() => color.create().conflicts(null), TypeError);
});

test('marks: adding an equivalent mark preserves the set', () => {
    const bold = new MarkType('bold');
    const mark = bold.create();
    const marks = Object.freeze([mark]);
    same(bold.create().add(marks), marks);
});

test('marks: adding a value replaces marks it excludes', () => {
    const color = new MarkType('color');
    const bold = new MarkType('bold');
    const red = color.create('red');
    const blue = color.create('blue');
    const strong = bold.create();
    const marks = blue.add(strong.add([]));
    const replaced = red.add(marks);
    equal(replaced.map(mark => [mark.type.name, mark.value]), [['bold', true], ['color', 'red']]);
    equal(marks.map(mark => mark.value), [true, 'blue'], 'Adding a mark must not mutate its source set');
    truthy(Object.isFrozen(replaced));
});

test('marks: one-way exclusion can reject or replace by policy', () => {
    const code = new MarkType('code', {excludes: []});
    const link = new MarkType('link', {excludes: ['code']});
    const encoded = code.create().add([]);
    same(link.create().add(encoded)[0].type, link, 'The new excluding mark wins');
    const linked = link.create().add([]);
    same(code.create().add(linked), linked, 'An existing excluding mark blocks the new mark');
});

test('marks: non-conflicting sets have deterministic order', () => {
    const code = new MarkType('code', {rank: 30, excludes: []});
    const bold = new MarkType('bold', {rank: 10, excludes: []});
    const color = new MarkType('color', {rank: 30, excludes: []});
    const expected = ['bold:true', 'code:true', 'color:"blue"', 'color:"red"'];
    let marks = [];
    for (const mark of [color.create('red'), code.create(), bold.create(), color.create('blue')]) marks = mark.add(marks);
    equal(marks.map(mark => `${mark.type.name}:${JSON.stringify(mark.value)}`), expected);
    let reverse = [];
    for (const mark of [color.create('blue'), bold.create(), code.create(), color.create('red')]) reverse = mark.add(reverse);
    equal(reverse.map(mark => `${mark.type.name}:${JSON.stringify(mark.value)}`), expected);
});

test('marks: exact and type-wide removal preserve unrelated marks', () => {
    const color = new MarkType('color', {excludes: []});
    const bold = new MarkType('bold');
    const red = color.create('red');
    const blue = color.create('blue');
    const strong = bold.create();
    const marks = strong.add(blue.add(red.add([])));
    same(color.create('green').remove(marks), marks);
    equal(red.remove(marks).map(mark => mark.value), [true, 'blue']);
    equal(color.remove(marks).map(mark => mark.value), [true]);
    same(new MarkType('color').remove(marks), marks, 'A separate type cannot remove another policy\'s marks');
    throws(() => red.add(null), TypeError);
    throws(() => red.remove([{}]), TypeError);
    throws(() => color.remove([{}]), TypeError);
});
