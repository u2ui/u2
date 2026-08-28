# Browser test suite

`index.html` runs dependency-free browser tests for every current production
file. `harness.js` deliberately provides only test registration, assertions,
fixture cleanup, and a machine-readable result.

Open `index.html` through HTTP in each current target browser. Completion is
reported through `document.documentElement.dataset.result` and
`globalThis.__rte2Tests`, allowing both visual inspection and automation.
The runner starts after `window.load`, so cold module loading cannot suppress or
reorder focus behavior under test.

Browser behaviors that intentionally depend on DevTools or top-level window
state belong in isolated reproduction pages rather than the deterministic main
suite. No such pages are currently part of RTE2.

`generated.test.js` adds seeded cross-module cases: it builds random editable
content from a fixed seed and asserts the invariants that no single fixture can
state — normalization converges, keeps visible text and stays idempotent, mapped
points keep their surrounding text through content-preserving operations, and
edit-range traversal agrees with its native range. Change a seed to explore
further; keep a case it uncovers as a named regression test.

## Coverage rules

- Every production file has a dedicated `*.test.js` beside its responsibility.
- Tests cover success, invalid input, lifecycle cleanup, nesting, selection
  direction, event ordering, cancellation, and state isolation.
- Tests must leave no fixtures, selections, listeners, or active cores behind.
- Browser-specific regressions receive a named test and are never hidden behind
  a user-agent condition.
- Unit tests dispatch focus events directly; programmatic `.focus()` depends on
  whether the test tab owns top-level browser focus. Trusted focus, keyboard,
  clipboard, and drag interactions belong to the automation suites.

## TODO

- Run the suite automatically in current Chromium, Firefox, and WebKit.
- Add trusted keyboard, clipboard, drag/drop, and IME automation helpers.
- Record coverage by responsibility without introducing a build requirement.
