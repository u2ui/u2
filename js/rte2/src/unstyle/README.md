# Unstyle policy

`unstyle.js` describes presentation cleanup independently of where the HTML
came from. The same immutable policy can power the selected-content command,
clean a detached fragment after security sanitizing, or clean only the element
roots added by native paste/drop.

## Contract

An `Unstyle` policy contains ordered named levels. A level lists exact
attributes to remove and/or inline elements to unwrap:

```js
const policy = new Unstyle([
    {name: 'classes', attributes: ['class']},
    {name: 'styles', attributes: ['style']},
    {name: 'formatting', elements: ['b', 'strong', 'span']},
]);
```

The default levels are `classes`, `styles`, legacy presentation `attributes`,
and `formatting`. Removing the last attribute from a `span` also unwraps that
neutral wrapper. Links, code, revision elements, lists, and tables are not
dismantled by the default formatting level.

`clean(root, {through, map, transaction, preserve})` applies every level up to and
including `through` to a DOM `Element` or `DocumentFragment`. `map` and
`transaction` are optional for detached fragments and preserve points plus
dirty ownership when cleanup runs on live editor content. `preserve` may be a
set of elements whose own presentation must remain unchanged even when a new
ancestor is cleaned. Their newly added descendants remain eligible. The
strength is mandatory: external input must not become more destructive merely
because an earlier level found nothing.

```js
const fragment = sanitizer.sanitize(externalHtml);
defaultUnstyle.clean(fragment, {through: 'styles'});
// Insert the detached fragment through an editor transaction afterwards.
```

`InputPipeline` uses the mapped live form only on element roots observed during
one native paste/drop. `ExternalInput` uses the detached form after explicitly
sanitizing rich data. Its `through` option may resolve a different named level
per surface or input type.

This order is deliberate:

1. the browser inserts natively, or a security sanitizer safely parses external HTML;
2. Unstyle removes unwanted presentation according to application policy;
3. structural normalization repairs the fragment in its editing context.

Unstyle is not a sanitizer and must never parse untrusted strings or precede
the security boundary.

## Invariants

- Policies and their levels are immutable and application-replaceable.
- Levels are cumulative for foreign fragments but individually addressable by
  the selection command.
- Cleanup preserves text and child order while unwrapping elements.
- Security, presentation cleanup, and structural validity remain separate.

## TODO

- Add separately configured structural levels for converting headings, lists,
  and tables while preserving visible text and boundaries.
- Add optional class-token and style-property rules before applications need
  finer cleanup than whole attributes.
