# Default HTML content model

The default HTML content model is RTE's ready-to-use rulebook for ordinary
HTML. It knows structures such as paragraphs, headings, lists, links, tables,
media, and form controls, so an application does not have to describe them all.

`html-model.js` supplies these defaults as data for `ContentModel`. Applications
may extend or replace them; commands and normalizers do not hardcode the rules.

## Defaults

- Flow containers accept flow content; paragraph and heading-like blocks accept
  phrasing content.
- Paragraphs, headings, and preformatted blocks are marked as splittable text
  blocks. Structural blocks such as lists, items, tables, and layout `div`s are
  not.
- Text blocks and list items are mergeable at their leading boundary. Layout
  containers and table structure are not mergeable by default.
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
