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

Current properties:

| Property | Values | Default |
| --- | --- | --- |
| `--u2-rte` | any truthy token | disabled |
| `--u2-rte-block` | tag name, `none`, `auto` | host-specific |
| `--u2-rte-enter` | `break`, `block`, `item`, `row`, `cell`, `auto` | host-specific |
| `--u2-rte-cleanup` | `none`, `minimal`, `structural`, `canonical` | `structural` |
| `--u2-rte-clean-on` | space-separated triggers | `input paste drop command` |
| `--u2-rte-ui` | `none`, `roaming`, `static` | `roaming` |

Functions, command implementations, and policy objects are intentionally not
encoded as CSS strings. They enter through module registration later.

## TODO

- Add allowed-content and paste-policy references once those registries exist.
- Decide whether typed `@property` declarations improve debugging without
  restricting inheritance or future values.
- Test container-query and adopted-style-sheet changes in integration suites.
