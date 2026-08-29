# Text formatting marks

A mark is formatting attached to text. Bold is a mark. A link is a mark with a
URL. A text color is a mark with a color value. Several marks can apply to the
same text, for example bold plus a link.

`mark.js` represents this formatting as immutable data. It answers the small,
shared questions that every formatting command has:

- Are two marks the same?
- May they exist together?
- Does a new mark replace an old one?
- In which stable order are several marks kept?

`dom-adapter.js` decides whether a mark is represented by `<strong>`, a class,
an attribute, a style, or something custom. `bold.js` provides the first ready
semantic mark: it reads `<strong>` and `<b>` and writes `<strong>`. The range
commands apply or remove those representations on selected text.

## Public contract

`MarkType` describes one kind of formatting. `bold`, `link`, and `color` are
different types. One type may have several concrete values: `color` can be
`red` or `blue`, and `link` can contain different URLs.

`new MarkType(name, options)` accepts:

- `rank` controls the stable order when several marks apply. Lower ranks come
  first. The default is `50`.
- `excludes` names the types removed when this type is added. By default a type
  replaces its own previous value, so blue replaces red. `[]` allows several
  values of that type at once; `['*']` replaces every mark.
- `create(value)` snapshots serializable value data and returns a `Mark`. The
  default value is `true`, which suits boolean marks such as bold.
- `remove(marks)` removes every mark of exactly that type.

A `Mark` is one concrete piece of formatting, such as `bold: true`,
`color: "red"`, or `link: {href: "/docs"}`. A mark array describes all
formatting at one text position.

- `equals(mark)` compares type identity and canonical value data.
- `conflicts(mark)` reports exclusion in either direction.
- `add(marks)` returns a new frozen array in stable order. Adding the same mark
  changes nothing. A new mark removes types it excludes; an existing mark may
  block it through a one-way exclusion.
- `remove(marks)` removes only that exact type and value.

Values may contain strings, finite numbers, booleans, `null`, arrays, and plain
objects. Objects are copied with sorted keys and all copied containers are
frozen. The same link therefore compares equal even when its object keys were
written in a different order. Functions, DOM nodes, cyclic data, and other
stateful objects are not mark values.

```js
const bold = new MarkType('bold', {rank: 10});
const color = new MarkType('color');

let marks = bold.create().add([]);
marks = color.create('red').add(marks);
marks = color.create('blue').add(marks); // replaces red

// marks now means: bold text with the color blue
```

## DOM adapter

A `MarkAdapter` translates between formatting data and HTML. Reading recognizes
existing elements; rendering creates the empty canonical wrapper used for bare
or partially selected text.

```js
const boldHtml = new MarkAdapter(bold, {
    selector: 'strong, b', // both existing forms mean bold
    tag: 'strong',         // new bold text uses <strong>
});

boldHtml.parse(document.querySelector('b')); // a bold Mark
boldHtml.render(bold.create(), document);     // an empty <strong>
```

`selector` selects possible source elements. `read(element)` returns their mark
value or `undefined` when a selected element does not represent the mark.
`tag` plus `write(element, value)` creates the canonical wrapper. `write` can
also decorate a reusable existing element. `clear(element, value)` removes only
this mark and leaves its other classes or attributes alone. Returning `true`
additionally asks the command to remove the representation wrapper. A bare
wrapper is unwrapped; remaining attributes are retained on a neutral `span`. A
custom `render(document, value)` may replace `tag` for custom elements or other
application policies.

The same contract handles semantic elements, classes, HTML attributes, and CSS
declarations because their `read`, `write`, and `clear` functions differ while
the mark value and command logic stay the same. Rendered wrappers must be empty,
detached, and owned by the requested document.

`reuse` is `false` by default. Set it to `true` to allow every suitable,
fully-selected phrasing element, or provide a function to restrict reuse
further. The range command still excludes blocks, atomic elements, the editing
host, and nested editable boundaries.

```js
const x = new MarkType('x');
const xHtml = new MarkAdapter(x, {
    selector: '.x',
    tag: 'span',
    reuse: true,
    write: element => element.classList.add('x'),
    clear: element => element.classList.remove('x'),
});
```

With that adapter, selecting `llo` in `hello` creates
`he<span class="x">llo</span>`. Selecting a complete `<b>dear</b>` reuses it as
`<b class="x">dear</b>`. Removal keeps the `<b>` and only unwraps a `span` when
clearing the mark leaves it without attributes.

## Ready-made bold

```js
import {bold, boldHtml} from './rte.js';

boldHtml.parse(document.querySelector('b')); // bold.create()
boldHtml.render(bold.create(), document);     // <strong>
```

`bold` is the immutable `MarkType`; `boldHtml` is its replaceable default HTML
adapter. New bold text uses `<strong>`, while both `<strong>` and `<b>` count as
active and can be removed. Removing a bare alias unwraps it. If the element also
has unrelated attributes, those survive on a neutral `span`.

Applying a mark joins adjacent canonical wrappers produced by that adapter, so
two neighboring `<span class="x">` elements become one. A wrapper carrying
additional classes, attributes, or tag semantics is preserved: the adapter
cannot assume that those mean the same thing as its mark.

Range commands expose `true`, `false`, or `'mixed'` state for selected editable
text. At a caret they report whether its structural DOM position is inside the
mark; a boundary outside a wrapper stays outside. Atomic elements and nested
editable hosts are ignored because the same commands cannot format their
contents. Toggle removes a fully active mark and applies it across inactive or
mixed selections.

`PendingMarks` can extend those commands at a caret. It stores only an explicit
override for one surface and replaces the next `insertText`; afterward the DOM
it created carries the mark and native input resumes.

## Invariants

- Type identity decides equality and removal. Type names deliberately connect
  exclusion rules.
- Set operations never mutate their source and preserve its identity for a
  no-op.
- Equivalent non-conflicting inputs produce the same canonical set order.
- Exclusion is directional policy; conflict reporting is symmetric.
- The algebra contains no editor, document, selection, or module-global mutable
  state. DOM mutation belongs to the adapter and range commands.
- Ready-made types and adapters are immutable shared defaults; applications may
  replace them with their own policy.

## Browser considerations

The algebra uses standard JavaScript data. Adapters and range commands use the
standard DOM, `Range`, and `Selection` APIs without an engine-specific branch.
The shared real-browser suite covers boundary splitting, multi-block ranges,
backward selections, atomic elements, nested editors, reuse, and cleanup.

## TODO

- Merge compatible wrappers across nested equivalent structures.
- Apply and remove complete, conflicting mark sets rather than one concrete mark
  at a time.
- Carry pending marks through composition input.
