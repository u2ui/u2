# Configuration

`config.js` resolves inheritable CSS custom properties for one editable host.
Absent values and `auto` use semantic defaults derived from the host tag.

## Contract

- `enabled(host)` detects the opt-in property `--u2-rte`.
- `hostDefaults(host)` returns a shared immutable default for block and Enter
  behavior.
- `config(host)` returns an immutable snapshot of the current computed settings.
- CSS is read on demand, so class changes and media/container queries can alter
  behavior without recreating a surface.
- Unknown enum values fall back safely instead of becoming implicit modes.
- A block value is used only when it is a usable lowercase tag name, so a typo,
  quoted value, or value list cannot reach `createElement()`.

Current properties:

| Property | Values | Default |
| --- | --- | --- |
| `--u2-rte` | any truthy token | disabled |
| `--u2-rte-block` | tag name, `none`, `auto` | host-specific |
| `--u2-rte-enter` | `break`, `block`, `item`, `row`, `cell`, `auto` | host-specific |
| `--u2-rte-cleanup` | `none`, `minimal`, `structural`, `canonical` | `structural` |
| `--u2-rte-clean-on` | space- or comma-separated triggers | `input paste drop command` |
| `--u2-rte-elements` | tag list, `@basic`, `@article`, `@document`, `all` | `all` |
| `--u2-rte-import-unstyle` | `none` or an installed Unstyle level | `styles` |
| `--u2-rte-ui` | `none`, `roaming`, `static` | `roaming` |
| `--u2-rte-toolbar` | control names separated by spaces or commas | every represented control |
| `--u2-rte-toolbar-when` | `always`, `selection` | `always` |

`--u2-rte-enter` is consumed by the `enter` command: `break` inserts a line
break, every other value names the element Enter splits. `--u2-rte-ui: none`
hides a roaming `Toolbar`; `static` is reserved for the future static binding.
The convention client in `rte.js` currently represents only `bold`, so additional
toolbar names stay invisible until an optional module supplies both command and
control.
See [`../command/README.md`](../command/README.md) and
[`../ui/README.md`](../ui/README.md).

Semantic block defaults preserve native container shape: generic block hosts
such as `div` use `p`, lists use `li`, and table structure uses `tbody`, `tr`,
and `td`. A directly editable `li`, `caption`, `th`, or `td` keeps phrasing
content unwrapped and Enter inserts `br`. Any host can override this, including
opting those containers back into paragraphs with `--u2-rte-block: p` and
`--u2-rte-enter: block`.

Functions, command implementations, and policy objects are intentionally not
encoded as CSS strings. They enter through module registration.

`--u2-rte-elements` is a structural output policy shared by cleanup and
commands. An explicit list is application-specific; the frozen `basic`,
`article`, and `document` presets are exported as `elementPresets` and selected
in CSS with an `@` prefix:

```css
.article-editor {
    --u2-rte-elements: @article;
}
```

An unknown preset or malformed list resolves to an empty allowlist rather than
silently broadening content. `all` retains the complete supplied content model.
The list controls elements only; it is deliberately not an attribute or URL
sanitizer.

`--u2-rte-import-unstyle` controls presentation cleanup for native paste and
drop. The default removes classes and inline styles only from elements added by
that input; `none` keeps native presentation. A custom `Unstyle` policy may
provide other level names.

`--u2-rte-classes` lists the class names the host treats as content. It is one
declaration with three consumers: the style control offers exactly those names,
the sanitizer keeps only those from external HTML, and presentation cleanup
leaves them and their wrappers alone. A host that declares none behaves exactly
as before.

`--u2-rte-import-elements` is what may *arrive*, a narrower question than
`--u2-rte-elements`, which is what a host tolerates in content it already owns.
It defaults to the `@content` preset: headings, text, lists, tables, media, and
the text-level semantics that carry meaning — no layout, no embeds, no forms.
The host list still bounds it; neither can widen the sanitize policy.

`--u2-rte-import-sanitize` switches that whole stage off with `none`, leaving
what the browser inserted. Which attributes and protocols are acceptable stays
in JavaScript with the policy — that is a security decision, not a presentation
one, and not something CSS should be carrying.

## TODO

- Add named sanitize-policy references when applications need CSS selection
  among several registered JavaScript policies.
- Decide whether typed `@property` declarations improve debugging without
  restricting inheritance or future values.
- Test container-query and adopted-style-sheet changes in integration suites.
