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
- `comments` and `dataAttributes`: explicit booleans, both false by default.

The supplied `sanitizePolicy` accepts the `document` element preset, ordinary
editor metadata, and conservative web URLs. Inline styles, event attributes,
`data:` URLs, comments, and data attributes are not enabled by default.
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
`innerHTML` fallback. A future DOMPurify adapter will implement the same policy
for those engines.

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

## TODO

- Add the DOMPurify-compatible adapter without changing the policy contract.
- Add contextual parsing for table and list insertion sites.
- Add optional class, inline-style, and richer image URL policies.
- Cover mutation-XSS and pasted office markup with shared adapter fixtures.
