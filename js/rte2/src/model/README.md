# Content model engine

A content model is the editor's rulebook for valid document structure. For
example, it can say that a `ul` contains `li` elements and that a paragraph may
contain text but not another block.

`content-model.js` stores and evaluates these rules. It only answers whether a
node is allowed directly inside another node; it never changes the DOM itself.
The generic engine does not hardcode HTML rules.

## Rule shape

- `groups`: categories the node belongs to, such as `flow` or `phrasing`.
- `children`: accepted tag names, `#text`, `*`, or category tokens prefixed by
  `@`.
- `exclude`: child tags or categories forbidden below this element, including
  through transparent descendants.
- `block`, `atomic`, and `void`: editor semantics used by traversal and repair.
- `defaultChild`: structural wrapper used when direct content needs repair.
- `transparent`: inherit the nearest concrete ancestor's child model.
- `allow(parent, child, model)`: an optional dynamic decision. Returning
  `undefined` falls back to `children`.

## Contract

- Rules, lists, and models are immutable after construction.
- Names, categories, and category tokens are ASCII-case-insensitive.
- Text, unknown elements, and non-content DOM nodes have separate fallback
  rules.
- Transparent rules require a real DOM context; a detached tag name alone is
  intentionally insufficient.
- `extend()` creates an isolated model, shallowly merging named rule overrides
  and allowing a rule to be removed with `null`.
- The model describes validity only. It never mutates DOM, chooses a repair,
  crosses editing hosts, or reads browser-computed styles.

## TODO

- Add contextual constraints that depend on sibling order and required child
  sequences.
- Expose diagnostic reasons without complicating the hot `allows()` path.
- Add namespaced SVG and MathML integration points.
- Compile large policies only if profiling shows rule lookup is significant.
