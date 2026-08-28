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
input path, and Enter now close the phase-3 gap between configuration and
behavior. The next production responsibility is phase 4: define the mark algebra
in tests and documentation, then implement range-based inline commands without
`execCommand()`.

The 106-test baseline was confirmed in current Chromium, Firefox, and WebKit.
The current runner contains 191 tests. This revision passes all of them in
Chromium 152 and Firefox 154; WebKit still has to confirm the same revision.
Treat the number shown by `/u2/js/rte2/tests/` as authoritative when tests are
added.

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
selection mapping, teardown, and command routing for prevented native input are
implemented. Sanitized external insertion is next; deletion types stay native
until commands can delete a range.

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

Status: next. Specify the replaceable mark descriptor and its equivalence,
conflict, merge, and removal rules before adding command implementations.

- Implement apply, remove, and toggle over arbitrary ranges without
  `document.execCommand()`.
- Support semantic elements, class tokens, attributes, style declarations, and
  custom mark adapters through one algebra.
- Represent mixed state and pending collapsed marks.
- Split boundaries minimally; merge equivalent siblings; eliminate redundant,
  conflicting, or empty wrappers.
- Implement bold, italic, underline, strike, code, link, and remove-format as
  ordinary registered commands.

Tests combine partial text, multiple blocks, nested marks, overlapping removal,
backward selections, atomic content, repeated toggles, and exact undo.

## 5. Structural commands

Status: started. The command registry, the `Edit` execution context, the
`PointMap.split()` primitive, and the Enter/line-break commands are
implemented; everything below is open.

- Paragraph and heading conversion, line/block split and merge.
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

- Implement a native HTML Sanitizer API adapter and a DOMPurify-compatible
  adapter behind one policy contract.
- Keep security sanitizing separate from structural normalization.
- Serialize canonical HTML without editor-only markers or browser debris.
- Test hostile fragments, contextual parsing, mutation-XSS regressions, URL
  attributes, custom elements, pasted office markup, and policy narrowing.

## 8. UI adapters

- Publish command availability and active/mixed state as observable editor
  state.
- Implement a roaming UI that follows the active surface.
- Implement static UIs bound to one surface; allow several UIs and command
  subsets to coexist.
- Keep focus without losing or accidentally moving the saved editor selection.
- Configure serializable UI behavior and command sets through CSS variables.

## 9. Browser policies and release gate

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
