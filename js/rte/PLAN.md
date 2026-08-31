# RTE implementation plan

Each phase ends with documentation, dedicated tests for every production file,
real-browser verification, and no known failing invariant. Later phases may
refine earlier contracts, but may not bypass their responsibility boundaries.

The working `../rte0` is a behavioral reference throughout the project. Existing
behavior, especially host-specific editing, selection handling, and browser
fixes, is first captured as black-box tests. RTE then preserves or deliberately
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
registry-owned shortcuts raise it to 500 tests. Depth-independent wrapper
removal, a canonical level that does something, and paste cleanup that covers
what arrived raise it to 508 tests. The attribute policy on native imports
and a strict import element policy raise it to 513 tests, confirmed in Chrome
152 and Firefox 154. Import aliases raise it to 519 tests, and the table
structure commands with their contextual handles to 538, and the image frame
with its attribute command to 554, all of it drawn in one shadow root per
editor; whole-content remove-format and the presence/availability rule raise it
to 565. The playground now configures its prototype surface live from a panel
built out of the registered modules, so every host property can be tried without
editing the page.
WebKit verification of that revision is pending.

Remove-format now runs a ladder that does not stop at the application's own
presentation: six presentation rungs in `Unstyle` (styles, presentational
attributes, foreign classes, formatting wrappers, declared content classes, and
the remaining semantic inline elements) plus a seventh `blocks` rung in the
command that reduces lists, tables, quotes, and headings to the host's default
block. The action is unavailable only when the selection is already plain text,
and a collapsed caret reaches the whole content rather than nothing.
Keyboard shortcuts moved from toolbar controls to the command registry, so a key
works whether or not a control is on screen, and `Tab`/`Shift+Tab` reach the
list-nesting commands only inside a list.

What may arrive is now its own question. `--u2-rte-import-elements` defaults to
the `@content` preset — headings, text, lists, tables, media and the text-level
semantics — while `--u2-rte-elements` stays what a host tolerates in content it
already owns. Neither can widen the sanitize policy.

An element the import list does not carry, but whose meaning a listed one does,
is replaced rather than dropped: `<b>` becomes `<strong>`, `<i>` becomes `<em>`.
Nothing did that afterwards — the bold mark recognizes `<b>`, but only a mark
command ever makes an element canonical — so a strict list would otherwise have
turned every pasted emphasis into plain text.

A native paste now meets the attribute policy. Nothing is parsed there — the
browser inserts its own payload — so it was the one import path without an
allowlist, and layout ids, tracking attributes and inline styles came straight
through. The pipeline applies `SanitizePolicy.clean()` to the nodes that
arrived, before presentation cleanup and structural repair, so an id removed in
the first stage is what lets the third dissolve the wrapper carrying it.
`--u2-rte-import-attributes: keep` opts a host out.

Pasted content is now cleaned where it landed. The cleanup scope was derived
from the caret, which sits at the *end* of a paste, so a pasted document was
only ever repaired in its last block — the reason legacy markup survived intact
even after the planner learned to remove it. The nodes that arrived are already
tracked, and now decide the scope.

Redundant markup is now removed at any depth. A neutral generic block was only
ever reshaped as a direct child of the root, so legacy documents kept their
nested bare `div`s — valid HTML, which is exactly why the content model alone
never removed them. `canonical` also stopped being a synonym for `structural`:
it now dissolves a generic inline wrapper that carries nothing.

The same work made normalization measurably cheaper. Measured in Chrome 152 as
the best of five runs against the previous revision: `ContentModel.allows()`
14.8 → 3.2 µs, one paragraph normalized 213 → 85 µs, a clean 264-element article
18.7 → 7.1 ms. The model no longer allocates a string per rule lookup and skips
the ancestor-exclusion walk for children nothing can exclude; the normalizer no
longer asks the executor to confirm the plans that change nothing, and no longer
re-validates every element the walk just collected.

A review pass consolidated four duplicated concepts into single definitions
(`isEditingBoundary`, `elementOf`, `indexOf`, `narrow`), removed a duplicated
availability check and a second placement policy, and made `edit.model` resolve
lazily. Measured in Chrome 152: an availability check that does not consult the
content model dropped from 10.0 to 1.8 µs, the list scan from 31.4 to 21.0 µs,
and one toolbar refresh from 490 to 437 µs. A lazy `config()` was measured and
rejected: building eight accessor descriptors costs more than parsing the values
eagerly.
Treat the number shown by `/u2/js/rte/tests/` as authoritative.

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

The first batteries-included convention-client prototype is implemented: one
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
- Presence follows the configuration and availability the selection: a control
  this editor does not offer is absent, one that cannot act right now is
  disabled. A toolbar that rearranged itself as the caret moved would move its
  targets out from under the pointer. `--u2-rte-toolbar-unavailable: hide`
  trades that away where a host prefers a toolbar of only what it can do.
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
   The form applies as it is typed rather than on an Apply button, marking each
   run as ongoing input so history keeps an address as one step, and it closes
   when the selection leaves the link it was opened on. Editing the link text
   itself remains open.
4. **Table tools — implemented as commands.** `Tables` groups insertion,
   row and column insertion and deletion, and table removal. It names no
   section, row, or cell tag: each comes from the model's `defaultChild`, one
   level apart. Every change is an ordinary mapped mutation, so it is one undo
   step and the caret lands where the edit happened. Spanning cells make the
   index-counted actions unavailable rather than shifting the wrong cells.
   `tables.js` puts them on the table itself: row handles down its left edge and
   column handles along its top, each lined up with the cell the caret is in,
   repositioned from selection, change, input, scroll and resize rather than
   from a timer. Cell movement and span-aware column arithmetic remain open.
5. **Image sizing — implemented.** `selectedElement()` and
   `elementAttributes()` make the one element a selection covers addressable and
   give it a value command over a fixed set of attributes; `images.js` adds the
   frame and the pointer interaction. The drag moves the frame only and the size
   is written once on release, so a resize is one undo step and the overlay owns
   no size policy: `width` and `height` are what the sanitize policy allows on an
   image. What is resizable is a selector. Its three handles sit on the trailing
   edges only, because the flow holds an image's top and start edges: the corner
   keeps the proportion, the two edges change one measurement each. An alt-text
   editor and keyboard resizing remain open, as does a hook for regenerating the
   file server-side rather than letting the browser stretch it.

All roaming and contextual extension UI must be created in the core's
`Document` or `ShadowRoot`, use the browser top layer through Popover or Dialog
where appropriate, and share one placement policy.

Everything the convention client draws lives in one `Chrome`: a single shadow
root per editor holding the toolbar, the contextual handles, the link form and
the source dialog. An editor is chrome inside someone else's document and has to
survive their `button {}` rule; one encapsulated root also means the application
sees a single element instead of one per piece of UI. There is no `::part`
surface on purpose — it would make the chrome's internal structure a public
contract, and an application that wants different chrome builds its own on the
commands, which `Toolbar` has always supported by binding markup it is given.
The chrome now follows the active surface through the closest modal dialog,
open popover, or fullscreen boundary and returns to its original root when that
boundary closes. Native inertness makes descendant mounting mandatory; core
retention keeps the temporary UI child out of focus deactivation, Source, and
History even when the top-layer element is itself the editing host.

The handles inside it are one shared `Handles` component that owns no editor
concept, so anything with a rectangle can use it, inside this engine or outside
it: given a document instead of a shadow root it brings its own. Shadow-root style ownership,
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
usage anywhere in RTE.
