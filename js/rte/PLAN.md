# RTE2 implementation plan

Each phase ends with documentation, dedicated tests for every production file,
real-browser verification, and no known failing invariant. Later phases may
refine earlier contracts, but may not bypass their responsibility boundaries.

The working `../rte` is a behavioral reference throughout the project. Existing
behavior, especially host-specific editing, selection handling, and browser
fixes, is first captured as black-box tests. RTE2 then preserves or deliberately
improves it through smaller responsibilities; structural weaknesses in the old
implementation are not mistaken for behavioral failures.

## Resume work

Phases 0–3 provide the core, selection/range primitives, content model, scoped
normalization, playground, and input pipeline. The command layer, the prevented
input path, and Enter close the phase-3 gap between configuration and behavior.
Phase 4 has started with immutable mark types, serializable values, equivalence,
directional conflicts, deterministic sets, removal, and replaceable DOM
adapters. Generic non-collapsed range commands now apply and remove one mark,
including reusable inline elements and neutral-span cleanup, without
`execCommand()`. Selection and caret state, toggle, and pending ordinary text
input are implemented. Adapters can explicitly remove semantic wrappers while
preserving unrelated attributes, and the standard HTML adapters for bold,
italic, underline, strike, code, and links exercise the whole path. Pending
overrides now carry through native IME composition without
intercepting its mutations. Complete mark sets now resolve exclusions, remove
configured values absent from an exact target, and apply their canonical result
inside one mapped operation.

The 201-test mark-algebra baseline was confirmed in current Chromium, Firefox,
and WebKit. The 233-test pending-mark baseline passes in current Chromium,
Firefox, and WebKitGTK through GNOME Web. The 361-test baseline was confirmed in
Chromium, Firefox, and WebKit. The current runner adds empty list
exit, context-aware nested-list Enter, mixed generic-block repair, the roaming
toolbar, semantic wrapper removal, ready-made bold, the convention client with
optional command modules and block-style values, heading-aware Enter,
content-model-driven block merging in both deletion directions, focus
dismissal, collapsed range geometry, and one shared structural element policy
for normalization, commands, and toolbar choices. The current lifecycle and
visible-break extension, sanitizing policy/native adapter, selection-only
toolbar mode, staged Unstyle policy/command, mapped context-aware fragment
replacement, fail-closed rich paste/drop composition, and mapped post-native
presentation cleanup and composition-aware pending marks raise the verified
runner to 369 tests. Complete mark-set coverage raises the current runner to
375 tests. Nested canonical mark coverage raises the current runner to 379
tests. Standard HTML mark coverage raises the current runner to 381 tests.
State-based history — baseline entries, transaction-grouped recording, path
addressed selection restoration, coalescing, branch and limit handling, and its
commands — raises the current runner to 398 tests. Lists, their nesting levels,
model-placed element insertion, and the standard mark and structure convention
modules raise the current runner to 427 tests. Atomic-block deletion,
selection-owned history commands, and the HTML source responsibility with its
dialog module raise the current runner to 452 tests. Value marks and the
contextual link editor raise the current runner to 470 tests. The CSS-declared
content classes shared by the style control, the sanitizer, and presentation
cleanup raise the current runner to 486 tests. One shared placement policy and
its coverage raise it to 490 tests. The full remove-format ladder and
registry-owned shortcuts raise it to 500 tests, confirmed in Chrome 152 and
Firefox 154.
WebKit verification of that revision is pending.

Remove-format now runs a ladder that does not stop at the application's own
presentation: six presentation rungs in `Unstyle` (styles, presentational
attributes, foreign classes, formatting wrappers, declared content classes, and
the remaining semantic inline elements) plus a seventh `blocks` rung in the
command that reduces lists, tables, quotes, and headings to the host's default
block. The action is unavailable only when the selection is already plain text.
Keyboard shortcuts moved from toolbar controls to the command registry, so a key
works whether or not a control is on screen, and `Tab`/`Shift+Tab` reach the
list-nesting commands only inside a list.

A review pass consolidated four duplicated concepts into single definitions
(`isEditingBoundary`, `elementOf`, `indexOf`, `narrow`), removed a duplicated
availability check and a second placement policy, and made `edit.model` resolve
lazily. Measured in Chrome 152: an availability check that does not consult the
content model dropped from 10.0 to 1.8 µs, the list scan from 31.4 to 21.0 µs,
and one toolbar refresh from 490 to 437 µs. A lazy `config()` was measured and
rejected: building eight accessor descriptors costs more than parsing the values
eagerly.
Treat the number shown by `/u2/js/rte2/tests/` as authoritative.

## 0. Foundation

Status: implemented. The 106-test foundation and policy suite passed in current
Chromium, Firefox, and WebKit. Later phase tests extend the same browser runner.

- CSS configuration with semantic host defaults.
- One core per selection context and multiple editable surfaces.
- Direction-preserving selection snapshots based on live ranges.
- Synchronous transactions, dirty-node collection, lifecycle events, and
  nested transaction reuse.
- Dependency-free browser test runner.

Exit criteria:

- Static checks pass.
- Foundation suites pass in current Chromium, Firefox, and WebKit.
- Focus, selection, nested editors, cancellation, and teardown leak no state.

## 1. Positions and ranges

Status: ownership, live points, range splitting, text/block traversal,
containment, and explicit operation mapping are implemented. The browser
baseline passed in all target engines. Generated cases cover range traversal and
the content-preserving point-map operations; `remove`, `replace`, and `move`
still need an oracle of their own.

- Define logical DOM points with affinity at text, element, and atomic bounds.
- Map points through split, wrap, unwrap, replace, move, merge, and remove.
- Traverse selected content by blocks and editable boundaries.
- Preserve forward/backward selections and collapsed carets through every
  primitive operation.

Tests emphasize every boundary offset, empty nodes, `<br>`, replaced endpoints,
atomic nodes, nested hosts, and generated forward/backward ranges.

## 2. Content model and normalization

Status: the immutable policy engine, standards-oriented HTML rules, pure repair
planning, mapped repair execution, scoped fixed-point normalization, and a
visual playground are implemented. Generated cases assert convergence,
idempotence, preserved text, and valid output across levels and host tags.

- Model permitted parents/children from HTML content categories plus editor
  policy overrides.
- Implement minimal, structural, and canonical normalization as convergent
  rules: repair, lift, split, unwrap, convert, merge, and remove.
- Preserve meaningful attributes, classes, and styles while removing neutral
  wrappers and empty metadata.
- Reduce transaction touches to the smallest stable dirty scopes; expand only
  when a repair crosses the boundary.
- Make normalization idempotent and canonical output deterministic.

The useful ideas in the old `NodeCleaner`—allow-lists, modernization, removal of
empty metadata, block-only wrapper detection, and Unicode normalization—become
separate policies. Computed-style comparison, prototype mutation, and unrelated
whole-tree cleanup are not carried forward.

## 3. Input pipeline

Status: post-native event classification, CSS cleanup triggers, live target
ranges, local normalization scope, composition deferral, nested-host isolation,
selection mapping, disposal, command routing with native text data for
prevented input, and replacement by an already prepared DOM fragment are
implemented. `ExternalInput` consumes rich paste/drop `dataTransfer` and the
native target range, applies the selected sanitizer and optional Unstyle
policy, and invokes mapped fragment insertion while failures stay fail-closed.
Without an explicitly selected sanitizer, native paste/drop remains
browser-owned; the pipeline removes classes and styles only from observed added
roots before structural normalization while preserving elements that predate
the input.
Collapsed backward and forward deletion at a
mergeable block boundary are routed explicitly; ordinary character and
selected-range key deletion remain native. Contextual plain-text and quotation
import are next.

- Route `beforeinput`, `input`, composition, paste, drop, delete, and Enter by
  `inputType` and host policy.
- Let native editing proceed only where its result is interoperable and covered
  by postconditions; otherwise prevent it and execute an explicit command.
- Sanitize external fragments before insertion, then normalize only the fragment
  and insertion neighborhood.
- Give lists, inline hosts, tables, generic blocks, and atomic content semantic
  default behavior that CSS can override.

Tests use trusted browser input where automation allows it and direct event/
command contracts for exhaustive edge cases.

## 4. Marks and inline commands

Status: started. Mark values define equivalence, directional exclusion,
canonical ordering, and removal. Replaceable adapters parse existing elements
and render canonical wrappers for semantic tags, classes, attributes, styles,
and custom policies. Generic commands apply and remove one configured mark over
arbitrary non-collapsed ranges, preserve selection direction, reuse suitable
inline elements, join adjacent canonical wrappers, clean up neutral spans, and
derive selection or structural caret state for toggle. A closed adapter
universe can now report and set exact canonical mark sets while resolving type
conflicts in the same transaction. Redundant nesting is removed, canonical
single-child wrappers follow mark rank, and newly exposed siblings merge to a
fixed point without crossing meaningful or atomic boundaries. Formatting other
than the standard HTML policies remains application-defined.
`PendingMarks` routes ordinary `insertText` through mapped input and applies the
same caret overrides to a live native composition range only after IME ends.
The ready-made adapters cover bold, italic, underline, strike, code, and links.
They render one canonical tag, remove their semantic wrappers explicitly, and
preserve unrelated attributes. Links use a small structured value without
coupling URL policy to mark representation.

- Apply, remove, and toggle over arbitrary ranges without
  `document.execCommand()`.
- Support semantic elements, class tokens, attributes, style declarations, and
  custom mark adapters through one algebra.
- Split boundaries minimally; merge equivalent siblings; eliminate redundant,
  conflicting, or empty wrappers.
- Keep staged remove-format separate as Unstyle because it spans multiple mark
  representations. A future link-control module owns URL entry and validation.

Tests combine partial text, multiple blocks, nested marks, overlapping removal,
backward selections, atomic content, repeated toggles, and exact undo.

## 5. Structural commands

Status: started. The command registry, the `Edit` execution context, the
`PointMap.split()` primitive, and the Enter/line-break commands are implemented.
Enter also exits an empty item from a nested list without crossing its surface,
splits content-model text blocks such as headings, and creates the configured
default block after a non-default text block's exact end. Backspace and Delete
merge compatible content-model blocks at either boundary and treat every caret
representation inside an empty block identically.
`BlockStyles` converts one or several known text-block wrappers, preserves
selection and unrelated attributes, reports mixed state, and supports custom
selector/tag/write/clear definitions without treating layout blocks as text
styles.
`Lists` owns one closed group of container elements and takes item elements from
the model's `defaultChild`, so no command names `li`. `toggle(tag)` converts
blocks into items, converts an existing list of another kind, and lifts items
back out; a partly selected list is split so only the selected run changes, and
a result that meets a list of its own kind joins it. `indent` and `outdent` move
a run between nesting levels and claim `formatIndent` and `formatOutdent`.
`insertNode(create, inputTypes)` inserts one prepared element where the content
model accepts it, splitting the caret's block only that far, and covers the
horizontal rule.

- Extend paragraph and heading conversion to loose pre-normalization text.
- Blockquotes, links, tables, and configurable atomic nodes.
- Preserve ordered-list numbering across a split or lift.
- Delete a non-collapsed selection before splitting or inserting, instead of
  leaving that case native.

## 6. History

Status: implemented as a state model. `History` records one entry per change of
one surface, storing the content as a cloned fragment with a path-addressed
selection that survives content replacement. A `MutationObserver` covers every
origin, so native typing, commands, paste, drop, and unrelated application
scripts all enter history without the engine owning their mutations.
Transactions supply the grouping boundaries: the `input` trigger coalesces into
one entry per interval, every other trigger records a discrete step before and
after itself. `undo`/`redo` are ordinary commands claiming `historyUndo` and
`historyRedo`; the input pipeline routes Ctrl/Command+Z and +Y from `keydown`
because a browser stops reporting those input types once its own stack no longer
matches replaced content. The convention client installs one history per
rich-text surface and contributes both toolbar controls.

- Store diffs instead of whole content states once transactions record
  reversible operations, keeping the state model for unowned mutations.
- Group composition deliberately rather than relying on its mutations alone.
- Expose the coalescing interval and an off switch as `--u2-rte-history`.
- Decide whether the entry limit should be measured in bytes rather than
  entries, and verify the cost on large documents.

## 7. Sanitizing and serialization

Status: started. `SanitizePolicy` now defines one immutable element, global and
per-element attribute, URL-protocol, comment, and data-attribute contract. The
first `NativeSanitizer` adapter parses into a detached fragment exclusively
through `Element.setHTML()`, intersects surface elements without broadening the
security policy, and fails explicitly when that safe sink is unavailable. It
has no unsafe fallback. Native paste/drop needs no parser fallback because its
payload stays browser-owned. `Source` now serializes a surface and parses source text back through the same
policy. A canonical serializer and contextual parsing remain open.
The independent immutable `Unstyle` policy supplies ordered presentation
levels to both the selection command and safely parsed external fragments, so
paste/drop will not grow a second formatting-cleanup list.
`insertFragment` now replaces a selection with such a prepared fragment through
mapped removal and insertion. Its content-model lifting handles inline, block,
list, and nested-link contexts without browser editing commands.
`ExternalInput` composes the three responsibilities for applications that
explicitly replace rich paste/drop. The default cross-engine path instead
cleans the browser's inserted DOM without reading its HTML payload.

- Resolve the surface's structural element policy once and use it as the upper
  bound for cleanup, command availability, paste/drop sanitizing, and toolbar
  choices. A sanitizer may narrow that policy but never broaden it.
`--u2-rte-classes` declares the class names a host treats as content. It is one
declaration with three consumers: the style control offers exactly those names,
`SanitizePolicy.clean({classes})` keeps only those from external HTML, and
`Unstyle` narrows the class attribute to them and leaves a wrapper carrying one,
because a declared class is content rather than presentation.

- Keep additional sanitizer adapters application-supplied behind the same
  policy contract unless a general engine use case requires one.
- Define allowed global/per-element attributes, URL protocols, class/data
  policy, inline-style policy, and comments separately from allowed elements.
- Keep security sanitizing separate from structural normalization.
- Serialize canonical HTML without editor-only markers or browser debris.
- Test hostile fragments, contextual parsing, mutation-XSS regressions, URL
  attributes, custom elements, pasted office markup, and policy narrowing.

## 8. UI adapters

Status: started. The optional roaming `Toolbar` binds application-owned markup
to the active surface's resolved command registry, reflects availability and
boolean/mixed state, keeps saved selections across UI focus, supports simple
Ctrl/Command shortcuts, hides after focus leaves surface and toolbar, and
delegates placement and presentation. Application-supplied manual popovers and
the convention toolbar now enter and leave the browser top layer with the same
visibility contract. `--u2-rte-toolbar-when: selection` optionally requires a
non-collapsed saved selection.

The first batteries-included `editor.js` prototype is implemented: one
side-effect import plus `--u2-rte` and `--u2-rte-toolbar` lazily wires standard
Enter/input behavior, Bold, and one shared default toolbar. It allocates no UI
before the first active rich-text surface and leaves `plaintext-only` native.
The explicit `rte.js` API remains the composable engine layer. Optional
extensions install atomically into current and future surfaces through
`Editor.add()`, contribute controls, and are removed everywhere through
`Editor.delete()`. The optional `blocks.js` module exercises this with a
command-valued Paragraph/H1/H2/H3 select and replaceable custom style policy.
The optional `breaks.js` probe adds one editor-wide `setup()` lifetime, one
per-surface `attach()` lifetime, a non-transactional view command, and a
presentation-only top-layer overlay without inserting markers into editable
HTML. Optional `unstyle.js` contributes a staged action whose first applicable
level changes only selected content; levels and labels are replaceable.

- Publish command availability and active/mixed state as observable editor
  state.
- Extend roaming controls beyond pressed buttons and command-valued selects to
  menus and application-owned custom controls. A select's `options` may already
  be a function of the surface, so a control's choices can come from the host's
  configuration; the client refills it before the toolbar is shown.
- A select with no usable choice hides like a button whose command is
  unavailable.
- Implement static UIs bound to one surface; allow several UIs and command
  subsets to coexist.
- Verify reusable placement policy across carets, ranges, writing modes, and
  viewport edges.
- Exercise the lifecycle with another contextual UI before adding dependency,
  ordering, or asynchronous setup concepts.

### Optional extension probes

These are concrete architecture tests, not commitments to one large plugin
framework. Each extension must install explicitly, add no resources while it is
absent, work for current and future surfaces, and release everything through
`dispose()` when it or its editor is removed.

1. **Visible line breaks — prototype implemented.** It is non-destructive but needs
   extension-owned presentation and per-surface state. Provide a CSS default,
   an optional toolbar toggle, and an always-on mode that needs no button. Do
   not insert marker nodes into editable HTML. Chromium does not render
   generated content on `<br>`, so the prototype uses one scheduled top-layer
   overlay without a mutation observer. Firefox and WebKit still need visual
   confirmation.
2. **HTML source editor — implemented.** `Source` serializes a surface by
   walking its DOM and reports where the selection lands in that text, so the
   view opens at the caret without inserting marker nodes. Formatting breaks a
   level into lines only where whitespace cannot be significant, and writing
   removes exactly those breaks again, so a read/write round trip is lossless.
   Writing always parses through the sanitizer and never assigns `innerHTML`.
   `source.js` adds the top-layer dialog, whose text area is wrapped in
   `<u2-code>` so the source is highlighted where that element is defined and
   plain where it is not; the engine itself gains no dependency. Mapping the
   dialog's own selection back into the DOM and a canonical serializer remain
   open.
3. **Link editor — implemented.** `valueMark(adapter)` generalizes the value
   half: one command creates, changes, and removes a mark whose value is
   content, and at a caret it acts on the whole mark it sits on, so an existing
   link's address can be changed without selecting its text. `link.js` adds the
   contextual form and an `unlink` control. Its address field is plain text
   because native url validation rejects relative paths, fragments, and
   application schemes; protocol and attribute policy stays with the sanitizer.
   Editing the link text itself remains open.
4. **Table tools.** Use a contextual overlay for row/column insertion,
   deletion, and cell movement. Structural changes remain ordinary mapped
   commands and later become ordinary history entries.
5. **Image sizing.** Use a contextual overlay and pointer interaction around a
   selected configured atomic image. Size policy, allowed attributes, mapping,
   and history stay outside the overlay.

All roaming and contextual extension UI must be created in the core's
`Document` or `ShadowRoot`, use the browser top layer through Popover or Dialog
where appropriate, and share one placement policy. Shadow-root style ownership,
focus transitions, disposal, and coexistence of multiple UIs are release-gate
tests, not application-specific details.

## 9. Browser policies and release gate

Status: started with `rangeRect()`, a non-mutating geometry fallback for
collapsed native ranges. Browser policies live in dedicated, independently
tested files rather than one global fixes bundle; semantic editing behavior
stays in its owning command, input, normalization, or UI responsibility.

- Isolate feature-detected Chromium, Firefox, and WebKit differences by the
  primitive or input behavior they correct.
- Promote every discovered browser quirk into a minimal regression test before
  adding a policy.
- Run generated range/DOM cases and interaction suites repeatedly in all target
  engines.
- Verify teardown, memory-sensitive listener ownership, accessibility, IME,
  mobile selection, touch, clipboard, drag/drop, and Shadow DOM.

The first release requires all suites green in the latest stable target
browsers, complete responsibility READMEs/TODOs, and no `document.execCommand()`
usage anywhere in RTE2.
