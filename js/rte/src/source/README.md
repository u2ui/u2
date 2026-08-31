# Source

Reads and writes one surface's content as HTML text, so an application can offer
direct source editing without giving up the engine's guarantees.

`source.js` provides the whole responsibility; the dialog that shows the text is
UI and belongs to a client module.

## Contract

- `new Source(surface, {sanitizer, indent})` needs nothing but a surface. The
  default sanitizer is a `NativeSanitizer`; `indent` must be whitespace.
- `read()` returns `{html, start, end}`. The offsets point into `html` and
  locate the current selection, or are null when the surface does not own one.
  Reading never mutates the surface.
- `write(html)` replaces the whole content and returns the inserted nodes. It
  runs as one transaction with the `source` command trigger, so it becomes one
  undo step, and it leaves the caret at the start of the new content.
- Writing rejects anything but a string.

## Reading

The writer walks the live DOM instead of post-processing a serialized string, so
it cannot invent markup, and it reports where DOM boundaries land in its output
as it goes — no marker nodes are inserted into the content being read. Escaping
is accounted for, so an offset inside `a &amp; b` is exact.

A level is broken into one node per line only when nothing on it can be affected
by added whitespace: every child is a block element, a comment, or whitespace
that is already there. Inline content therefore always stays on one line, and
the whitespace formatting adds is never significant.

## Writing

Source text is external input even when the same user just read it out, so it
always goes through the configured sanitizer, which parses through
`Element.setHTML()`. Nothing is ever assigned to `innerHTML`. The surface's
`--u2-rte-elements` narrows the sanitizer further, so a host cannot be filled
with elements it does not allow.

The line breaks reading added are removed again before insertion: a whitespace
node between block siblings is formatting, not content. This is the exact
inverse of the rule reading used, so reading and writing the same text is a
round trip.

## Browser considerations

- `Element.setHTML()` is required. `NativeSanitizer.supported()` reports whether
  it exists; there is deliberately no unsafe fallback parser.

## TODO

- Let non-interactive consumers replace content without changing selection or
  focus. Initializing a form adapter must not move the caret into its surface;
  the current `write()` always restores a selection at the start.
- Map the dialog's own selection back into the DOM after a write, the way
  reading maps the other direction.
- Serialize through a canonical serializer once one exists, so attribute order
  and boolean attributes are stable across engines.
- Report where a write's sanitizer removed content, so a source view can tell
  the user what was dropped instead of silently applying less than was typed.
