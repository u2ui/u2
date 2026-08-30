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
tests. Standard HTML mark coverage raises the current runner to 381 tests;
cross-browser verification of that revision is pending.
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
styles. The remaining structural commands are open.

- Extend paragraph and heading conversion to loose pre-normalization text;
  selected-range deletion remains open.
- Ordered/unordered lists with indent, outdent, split, and lift.
- Horizontal rules, blockquotes, links, tables, and configurable atomic nodes.
- Structural commands consult the content model rather than embedding host-tag
  exceptions in UI actions.

## 6. History

- Record transaction operations and selection before/after states.
- Group typing and composition deliberately; never group unrelated commands.
- Implement deterministic undo/redo independent of deprecated command APIs.
- Define how external DOM mutations invalidate or enter history.

## 7. Sanitizing and serialization

Status: started. `SanitizePolicy` now defines one immutable element, global and
per-element attribute, URL-protocol, comment, and data-attribute contract. The
first `NativeSanitizer` adapter parses into a detached fragment exclusively
through `Element.setHTML()`, intersects surface elements without broadening the
security policy, and fails explicitly when that safe sink is unavailable. It
has no unsafe fallback. Native paste/drop needs no parser fallback because its
payload stays browser-owned. Contextual parsing and serialization remain open.
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
  menus and application-owned custom controls.
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
2. **HTML source editor.** Revisit the useful selection-preserving ideas in
   `../rte`, but use a top-layer dialog and the canonical serializer. Applying
   source must pass through the configured sanitizer before normalization; it
   must never assign untrusted source directly to `innerHTML`.
3. **Link editor.** Build on the mark/value command contract and a contextual
   UI for text, target, and `rel`. Its URL protocol and attribute policy belongs
   to the sanitizer, not to toolbar code.
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
