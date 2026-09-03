# HTML sanitizing

Sanitizing is the security boundary for HTML that comes from outside the
editor, such as paste, drop, or an HTML source dialog. It decides which
elements, attributes, and URL protocols may enter a detached fragment.
Structural normalization runs only afterwards and has a different job: it
repairs editable document shape.

## Policy

`SanitizePolicy` is an immutable allowlist. Its options are:

- `elements`: element names the security policy can accept;
- `attributes`: global (`*`) and per-element attribute names;
- `protocols`: per-element rules for URL attributes;
- `drop`: element names that `narrow()` removes with their content;
- `comments` and `dataAttributes`: explicit booleans, both false by default.

An element outside `elements` keeps its content — dropping it would lose text the
author wrote. `drop` names the exception: elements a browser never renders the
children of, where unwrapping would turn a stylesheet, a script, or document
metadata into visible text. It defaults to `base head link meta noscript script
style template title` and, like every default, an application may replace it.

The supplied `sanitizePolicy` accepts the `document` element preset, ordinary
editor metadata, and conservative web URLs. An image may carry a `data:` URL,
because an image executes nothing — not even an SVG one, which browsers draw in
a script-free context; in a navigating attribute the same protocol is a page, so
links and citations keep it out. Inline styles, event attributes, comments, and
data attributes are not enabled by default.
Relative URLs use the explicit `relative` protocol token. Known URL attributes
without a matching protocol rule are removed rather than accepted implicitly.

```js
const policy = new SanitizePolicy({
    elements: ['p', 'a', 'strong'],
    attributes: {'*': ['class'], a: ['href', 'rel']},
    protocols: {a: {href: ['https', 'relative']}},
});
```

`clean(root)` enforces attribute and URL rules on an already safely parsed DOM
tree. It is public for adapters, but it is not an HTML parser or a standalone
security sanitizer: it must never be paired with `innerHTML`, `DOMParser`, or
another unsafe sink for untrusted input.

## Native adapter

`NativeSanitizer` passes input directly to `Element.setHTML()` on a detached
template and returns its `DocumentFragment`. It never inserts the result into
an editor. `sanitize(html, {elements})` intersects the security elements with a
surface's structural element list. Security-safe wrappers excluded by that
surface are unwrapped; the sanitizer policy can never be broadened.

The native HTML Sanitizer API is not available in every target engine yet.
`NativeSanitizer.supported(document)` exposes that capability. `sanitize()`
throws `NotSupportedError` when the safe sink is absent; it deliberately has no
`innerHTML` fallback. RTE's normal paste/drop path therefore remains native in
those engines and performs presentation plus structural cleanup afterwards; it
does not need to parse the clipboard HTML string.

The returned fragment remains untrusted if it is serialized back to a string.
Consumers should insert the fragment through the editor transaction path, not
round-trip it through an HTML string. `ExternalInput` composes that path for
rich paste/drop events and direct HTML imports.

## Invariants

- External HTML reaches no unsafe DOM sink.
- Surface element configuration narrows security policy and never broadens it.
- Attribute and URL policy remains separate from structural normalization.
- Sanitizing creates no editor state, listeners, or markers.
- Policies do not mutate after construction.

## Where the policy is applied

Three paths bring external HTML in, and all three now meet the same policy:

- `Source.write()` and `ExternalInput.insert()` parse an HTML string, so they go
  through the sanitizer's safe sink first and then `clean()`.
- An ordinary paste or drop is inserted by the browser itself. Nothing is parsed
  there and no fallback parser is needed, but the result still has to obey the
  same attribute policy — so the input pipeline applies `clean()` to the nodes
  that arrived. Until it did, the most common import was the only one without an
  allowlist, and layout ids, tracking `data-` attributes and inline styles came
  straight through.

`clean(root, {preserve})` spares elements that were already there, so a paste
never re-cleans the document it landed in.

`narrow(root, {elements, preserve, map, skip})` reduces a subtree to the elements
the policy allows, keeping the content of the rest. Parsed input gets this from
the safe sink; markup the browser inserted itself has to be narrowed afterwards.
`elements` may narrow further but never past the policy, and `skip` leaves an
element to a later stage.

`alias` names an equivalent for an element the list does not carry. Dropping
`<b>` would lose the emphasis it holds — nothing rewrites it later, because the
bold mark recognizes `<b>` but only a mark command ever makes an element
canonical — so a strict list keeps the meaning by taking `<strong>` instead. An
alias can only ever name an element the list already allows.

## Declared content classes

`clean(root, {classes})` narrows the class attribute to the given names without
touching the security policy. An application declares its content classes once
through `--u2-rte-classes`; external HTML then cannot smuggle in classes the
host does not know, and the same list drives the style control and presentation
cleanup.

## TODO

- Add contextual parsing for table and list insertion sites.
- Add optional class, inline-style, and richer image URL policies.
- Cover mutation-XSS and pasted office markup with shared adapter fixtures.
