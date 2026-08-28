# Normalization playground

`index.html` is a dependency-free visual client of the real `RepairPlanner`,
`Normalizer`, `PointMap`, and range classes. It contains no alternative editor
or normalization implementation.

Open `/u2/js/rte2/playground/` through the local HTTP server. Included scenarios
cover inline runs, generic blocks, redundant wrappers, lists, lift-and-split,
nested editable isolation, and the original invalid `p/div` example.

## Capabilities

- Analyze planned actions without changing DOM.
- Execute exactly one normalizer operation or run to a fixed point.
- Change cleanup level and default block through the production CSS custom
  properties; `auto` demonstrates semantic host defaults such as `li` for a
  `ul` editor.
- Dispatch selected Input Events through the production `InputPipeline` and
  control its `input paste drop command` triggers with `--u2-rte-clean-on`.
- Edit content directly or parse serialized HTML through the browser.
- Compare the live DOM tree with `innerHTML` serialization.
- Display executed actions, unresolved repairs, and selection endpoints.
- Map and restore a live selection through each normalization run.

Scenarios that browsers repair during HTML parsing are constructed with DOM
methods. The raw HTML button remains available specifically to expose that
difference.

`tests/playground.test.js` loads the complete page in a same-origin frame. It
checks bootstrapping, pure analysis, one-step selection restoration, complete
normalization, action reporting, host-specific list defaults, and synthetic
input routing in every target browser.

## TODO

- Highlight the nodes affected by the current plan in the editable view.
- Add scope selection and transaction dirty-scope visualization.
- Show before/after range boundaries for every individual operation.
- Export and import minimized custom scenarios as JSON.
- Add clipboard/drop payload and history panels when those modules exist.
