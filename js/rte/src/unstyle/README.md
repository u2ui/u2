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

## The ladder

The levels are ordered from least to most destructive and do not stop at the
application's own presentation. Someone who keeps pressing wants more removed,
so the ladder runs out of rungs only when the selection is plain:

| # | level | removes |
|---|---|---|
| 1 | `styles` | the `style` attribute |
| 2 | `attributes` | `align`, `bgcolor`, `width` and the other presentational attributes |
| 3 | `classes` | classes the host has **not** declared as content |
| 4 | `formatting` | `b`, `font`, `i`, `s`, `span`, `strike`, `u` — unwrapped |
| 5 | `contentClasses` | the declared classes too, and the wrappers carrying them |
| 6 | `inline` | the remaining semantic inline elements, links included |

Rungs 1–4 are scoped `foreign`: they spare the declared classes. Rung 5 is where
the application's own presentation goes, so rung 6 no longer needs to protect
anything.

With nothing selected the whole content is the target, so the ladder is a way to
clean a document as much as a way to clean a passage.

A seventh rung, `blocks`, reduces structure to the host's default block. It
needs the content model and mapped mutation and therefore lives in
[`../command/`](../command/README.md), not here: this policy also runs on
detached paste fragments, where there is no surface and no structure to reduce.

## Declared content classes

`clean(root, {keep})` names the classes the host treats as content. The class
level then narrows the attribute to those names instead of removing it, and the
formatting level leaves a wrapper that carries one, because the class applies to
that wrapper. `removable()`, `strip()`, and `declared()` are exported so the
selection command applies the identical rule from `--u2-rte-classes`.

## TODO

- Add separately configured structural levels for converting headings, lists,
  and tables while preserving visible text and boundaries.
- Add optional class-token and style-property rules before applications need
  finer cleanup than whole attributes.
