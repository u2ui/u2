# RTE2 playground

`index.html` is a dependency-free visual client of the real `RepairPlanner`,
`Normalizer`, `PointMap`, range classes, command registry, and mark commands. It
contains no alternative editor or normalization implementation.

Open `/u2/js/rte2/playground/` through the local HTTP server. Included scenarios
cover inline runs, generic blocks, redundant wrappers, lists, lift-and-split,
nested editable isolation, CSS-class marks, and the original invalid `p/div`
example.

## Capabilities

- Analyze planned actions without changing DOM.
- Execute exactly one normalizer operation or run to a fixed point.
- Change cleanup level and default block through the production CSS custom
  properties; `auto` demonstrates semantic host defaults such as `li` for a
  `ul` editor.
- Dispatch selected Input Events through the production `InputPipeline` and
  control its `input paste drop command` triggers with `--u2-rte-clean-on`.
- Observe the prevented-input path: `insertParagraph` and `insertLineBreak` run
  the registered `enter` and `lineBreak` commands instead of native editing;
  structural Backspace uses the same production command as the convention
  client.
- Apply, remove, or toggle the `.x` mark over a live selection. The toggle
  exposes active, mixed, and caret state; the dedicated scenario makes wrapper
  creation, reuse of an existing inline element, and cleanup of a neutral
  `span` visible in the DOM tree and serialized HTML. At a caret, toggling also
  formats the next ordinary text input through `PendingMarks`.
- Toggle the ready-made bold mark by button or Ctrl/Command+B. The scenario
  exposes `<b>` alias recognition, canonical `<strong>` output, semantic
  removal, and pending bold input at a caret.
- Exercise the production roaming `Toolbar` with application-owned markup: it
  follows the active surface, reflects command availability and mark state,
  preserves the selection during pointer or keyboard interaction, and uses the
  production collapsed-range geometry in its replaceable placement callback.
- Exercise the separate one-import `editor.js` prototype on a visible surface.
  It is opted in only through CSS and exposes its lazy default Bold toolbar,
  optional `blocks.js` value control, context-aware Enter behavior, and the
  optional staged `unstyle.js` action and non-mutating `breaks.js` line-break
  marker without playground-side wiring.
- Edit content directly or parse serialized HTML through the browser.
- Compare the live DOM tree with `innerHTML` serialization.
- Display executed actions, unresolved repairs, and selection endpoints. Green
  anchor and blue focus `┃` markers also show the exact boundary directly in
  the rendered DOM tree; element-boundary carets get their own marker line
  between the affected children.
- Map and restore a live selection through each normalization run.

Scenarios that browsers repair during HTML parsing are constructed with DOM
methods. The raw HTML button remains available specifically to expose that
difference.

`tests/playground.test.js` loads the complete page in a same-origin frame. It
checks bootstrapping, pure analysis, one-step selection restoration, complete
normalization, action reporting, host-specific list defaults, synthetic input
routing including structural Backspace, and the roaming toolbar. It also drives
the class-mark controls and checks their exact DOM result in every target
browser.

## TODO

- Highlight the nodes affected by the current plan in the editable view.
- Add scope selection and transaction dirty-scope visualization.
- Show before/after range boundaries for every individual operation.
- Export and import minimized custom scenarios as JSON.
- Add clipboard/drop payload and history panels when those modules exist.
