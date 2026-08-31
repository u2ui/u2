# RTE playground

`index.html` is a dependency-free visual client of the real `RepairPlanner`,
`Normalizer`, `PointMap`, range classes, command registry, and mark commands. It
contains no alternative editor or normalization implementation.

`hosts.html` is a focused live matrix for comparing the convention client
across block, text, interactive, list, table, and custom editing hosts. It also
covers links in both nesting directions, non-modal and declarative `show-modal`
dialogs, `showPopover()` and fullscreen hosts, plain-text editing, empty hosts,
and non-editable islands. The shared editor chrome follows an active native
top-layer boundary and returns to the document when that boundary closes.
It reports registration, resolved host defaults, selection, serialized content,
and recent native events without turning the observations into cross-browser
assertions.

Open `/u2/js/rte/playground/` through the local HTTP server. Included scenarios
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
- Exercise the convention prototype's full ready toolbar: undo and redo, the
  standard inline marks, bulleted and numbered lists with their nesting levels,
  and a separator. The readout under that surface reports how many history
  entries exist and where it stands, which makes grouping visible — continuous
  typing coalesces into one entry, while each command is its own step.
- Configure the prototype surface live from the panel beside it: tick the
  controls `--u2-rte-toolbar` lists, and switch the other host properties. A
  change and its effect stay in view at once, and the control names come from
  the registered modules, so the panel cannot drift from what the editor offers.
- Give a selection one of the host's declared content classes and watch the same
  declaration drive the sanitizer and remove-format.
- Click the image and drag a corner to resize it, or reset it to its own size.
- Put the caret in a table cell and use the handles on the table to add or drop
  its rows and columns.
- Create a link from a selection or edit an existing one from a caret through
  the contextual form, and remove one with the unlink control.
- Open the surface's HTML in the modal source dialog, syntax highlighted through
  `<u2-code>`, edit it, and apply it as one undo step.
- Toggle the ready-made bold mark by button or Ctrl/Command+B. The scenario
  exposes `<b>` alias recognition, canonical `<strong>` output, semantic
  removal, and pending bold input at a caret.
- Exercise the production roaming `Toolbar` with application-owned markup: it
  follows the active surface, reflects command availability and mark state,
  preserves the selection during pointer or keyboard interaction, and uses the
  production collapsed-range geometry in its replaceable placement callback.
- Exercise the one-import `rte.js` convention client on a visible surface.
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
