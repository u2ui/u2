# Default HTML content model

`html-model.js` supplies the standards-oriented starting policy for editable
HTML. It is data layered on `ContentModel`, not behavior embedded in commands
or normalizers.

## Defaults

- Flow containers accept flow content; paragraph and heading-like blocks accept
  phrasing content.
- Lists accept list items, definition lists accept their term/description
  structures, and table sections accept their native structural children.
  Structural children are not misclassified as general flow content.
- Lists, table sections, and rows declare their default repair child explicitly.
- Transparent elements such as `a`, `ins`, `del`, and `map` inherit their real
  DOM parent's content restrictions.
- Interactive descendants are excluded from links and buttons. Nested links
  are rejected through transparent wrappers.
- Replaced controls, media, line breaks, images, and horizontal rules are
  editor-atomic. HTML void elements are also marked `void`.
- Script, style, and template nodes are not flow content. Security sanitizing
  remains a separate mandatory stage for untrusted HTML.
- Unknown/custom elements are transparent flow/phrasing wrappers by default,
  so their permitted children follow the context where they are used.

`createHtmlModel(overrides)` returns an isolated extended policy when overrides
are supplied. Shipped rules are defaults and may be narrowed or replaced by an
application.

## Limits

This first policy describes direct parent/child validity and inherited
transparent content. It does not yet enforce sibling order, required children,
attribute-dependent categories, or every uncommon HTML element. Those become
additional constraints without changing the generic model API.

## TODO

- Cover ruby, media fallback, picture/source order, details/summary order, and
  definition-list grouping precisely.
- Add attribute-dependent interactive and embedded-content categories.
- Add SVG and MathML integration rules.
- Track relevant HTML Standard changes with focused conformance fixtures.
