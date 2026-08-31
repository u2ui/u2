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
- `textBlock`: a paragraph-like block that Enter may split, such as a heading;
  it implies `block`.
- `mergeable`: a block whose content Backspace may join into a compatible
  preceding sibling. It defaults to `true` for text blocks and remains an
  explicit policy for structural blocks such as list items.
- `defaultChild`: structural wrapper used when direct content needs repair.
- `transparent`: inherit the nearest concrete ancestor's child model.
- `allow(parent, child, model)`: an optional dynamic decision. Returning
  `undefined` falls back to `children`.
- `elements`: an optional final allowlist for output element names. Parent
  rules remain available as context even when the editing host itself is not
  output content.

## Contract

- Rules, lists, and models are immutable after construction.
- Names, categories, and category tokens are ASCII-case-insensitive.
- Text, unknown elements, and non-content DOM nodes have separate fallback
  rules.
- Transparent rules require a real DOM context; a detached tag name alone is
  intentionally insufficient.
- `extend()` creates an isolated model, shallowly merging named rule overrides
  and allowing a rule to be removed with `null`.
- `allowed(node)` answers the element allowlist independently of its current
  parent; text is still decided by the parent's `children` rule.
- `withElements(names)` returns and reuses an immutable narrowed model. This is
  the inexpensive bridge from a surface's CSS element policy to cleanup and
  commands.
- The model describes validity only. It never mutates DOM, chooses a repair,
  crosses editing hosts, or reads browser-computed styles.
- Element validity is not HTML sanitizing. Attributes, URL schemes, and hostile
  input require a sanitizer policy before insertion.

`defaultChild(node)` names the element a container fills itself with — `li` for
a list, `tr` for a table section. Structural commands use it instead of naming
tags, so the same command serves any configured list-like structure.

## TODO

- Add contextual constraints that depend on sibling order and required child
  sequences.
- Expose diagnostic reasons without complicating the hot `allows()` path.
- Add namespaced SVG and MathML integration points.
- Compile large policies only if profiling shows rule lookup is significant.
