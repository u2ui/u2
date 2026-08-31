# RTE
A modular rich-text editing engine for current browsers

RTE is a modern, modular rich-text editing engine for current browsers. Its
small core owns editor state, transactions, selections, and ranges; everything
else plugs in as an independent module. A UI is only one possible consumer.

## Install

```js
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@main/js/rte/rte.js"
```

## Demos

[index.html](http://gcdn.li/u2ui/u2@main/js/rte/tests/index.html)  

## Start here

Read this file for the design, then [`PLAN.md`](./PLAN.md) for implementation
status and the README beside the responsibility being changed for its exact
contract and TODOs. The current production path includes the representation of
text formatting after the command layer: registered commands replace prevented
native input, starting with Enter, while marks describe formatting such as bold,
links, and colors, how those values coexist, and how HTML represents them.
Generic commands now apply and remove one configured mark over a selected
range, derive active/mixed state, toggle it, and set an exact canonical mark set
within a caller-supplied adapter universe. Pending caret marks carry an explicit
override through the next ordinary text input or native IME composition.
Ready-made HTML adapters for bold, italic, underline, strike, code, and links
compose the same generic path.

Run the dependency-free browser suite at `/u2/js/rte/tests/` and inspect
normalization interactively at `/u2/js/rte/playground/`. The runner displays
its own test count and result. A result is cross-browser evidence only after
that exact revision has run in current Chromium, Firefox, and WebKit.

`../rte0` is a read-only behavioral reference. Reuse proven behavior and CSS
configuration ideas, but do not copy its architecture or modify its files.

## Intended features

- Native `contenteditable`, `Selection`, `Range`, `beforeinput`, and Input
  Events instead of a parallel document model.
- Stable selection snapshots that survive focus changes and controlled DOM
  mutations, including backward selections, multiple roots, Shadow DOM, and
  atomic elements.
- Transaction-based editing with predictable hooks before and after mutations,
  selection restoration, normalization, history, and change reporting.
- Composable modules for commands, keyboard behavior, paste/drop handling,
  normalization, schema rules, browser fixes, history, collaboration, and UI.
- Explicit browser policies: quirks stay isolated, feature-detected, tested,
  replaceable, and never leak into the generic editing core.
- Context-aware commands that expose availability, active state, and execution
  without depending on a toolbar.
- CSS-driven behavior and presentation through custom properties, selectors,
  states, and modern standards such as nesting and anchor positioning where
  useful.
- Semantic defaults derived from the editing host: lists create list items,
  inline-only hosts stay inline, and generic block hosts create paragraphs.
- One shared core per selection context coordinates any number of editable
  surfaces without duplicating document-level listeners or state machinery.
- Pluggable HTML policy aligned with the native HTML Sanitizer API. The native
  adapter is implemented for applications that explicitly parse HTML strings.
  Ordinary paste/drop remains browser-native and needs no fallback parser.
  Applications may narrow elements and attributes without coupling security
  sanitizing to structural editor normalization.
- Deterministic tests for browser input, selection direction, range boundaries,
  DOM mutations, undo/redo, clipboard data, focus changes, and known engine
  differences.

## Module contract

A module declares only the capabilities it contributes and receives an editor
context during setup. It may register commands, event handlers, transforms,
normalizers, state derivations, or browser policies. Resources are returned as
objects with one idempotent `dispose()` method.
Module order and conflicts are explicit; no module reaches into another
module's private state.

Public behavior is event- and transaction-oriented. DOM mutations happen
through the editor transaction boundary so ranges can be preserved and every
consumer observes one coherent change.

## Structure

Production responsibilities live under `src/`. Each one keeps its implementation,
tests, and README together so its local contract remains visible beside the
code. The root contains only the public entry point and project-wide clients,
tests, and documentation.

```text
rte/
├── blocks.js              Optional block-style module and public entry
├── classes.js             Optional content-class control module and entry
├── breaks.js              Optional visible-line-break extension and entry
├── images.js              Optional image frame and sizing module and entry
├── link.js                Optional contextual link editor module and entry
├── rte.js                 Stable public API, default core, and convention client
├── source.js              Optional HTML source view module and entry
├── tables.js              Optional table structure module and entry
├── unstyle.js             Optional staged remove-format module and entry
├── src/                   Production responsibilities
│   ├── browser/           Isolated native browser policies and fallbacks
│   ├── client/            Lazy batteries-included editor wiring and defaults
│   ├── command/           Registry, Enter/delete, structure, and range marks
│   ├── config/            CSS configuration and semantic host defaults
│   ├── core/              Shared root lifecycle and surface registry
│   ├── history/           Snapshot undo and redo for one surface
│   ├── input/             beforeinput, paste, drop, and composition
│   ├── mark/              Formatting values and HTML adapters
│   ├── model/             Replaceable HTML content rules and categories
│   ├── normalize/         Repair planning, execution, and normalization
│   ├── sanitize/          External HTML, attribute, and URL security policy
│   ├── source/            Surface content as readable and writable HTML text
│   ├── selection/         Selection, range, ownership, and point mapping
│   ├── surface/           State of one editable host
│   ├── transaction/       Atomic editing changes and dirty scopes
│   ├── unstyle/           Shared selection and external presentation policy
│   └── ui/                Editor chrome: toolbar, handles, placement
├── docs/                  Project-wide guides
├── playground/            Visual normalization, input, and mark inspection
└── tests/                 Shared harness and cross-module browser cases
```

Later layers depend on these public contracts, never on private
implementation.

## Runtime and UI

The normal setup has one core for a `Document` and registers multiple
`contenteditable` surfaces with it. A surface owns its configuration, schema,
history, and current editor state; the core owns shared event routing and the
active selection context. Additional cores remain possible for separate
documents, isolated tests, or deliberately independent environments, but are
not the default architecture.

UI modules consume core and surface state without becoming part of either. A
`Toolbar` now binds application-owned command controls to the active surface,
keeps its saved selection across UI focus, and leaves markup, styling, icons,
and placement replaceable. A future static UI binds to one surface. Several
roaming and static UIs may coexist and expose different subsets of the same
commands.

`rte.js` is also the convenience layer: importing it once and opting hosts in
with `--u2-rte` lazily adds the standard Enter/input path, Bold, and one shared
default toolbar. Optional extensions can add and remove commands, controls, and
owned resources across current and future surfaces through the client without
changing the engine. The provisional decisions stay in `src/client/`; explicit
consumers import only the modules they need and never touch `editor`.

The convention client's own defaults arrive as three ordinary modules using
that same contract: `history` for undo and redo, `marks` for the ready inline
marks, and `structure` for lists, their nesting levels, and a separator. They
hold no privileged position and can be removed like any other module; every
control they contribute is gated by `--u2-rte-toolbar`.

The first substantial optional command module is `blocks.js`. It contributes a
command-valued Block style select for Paragraph, H1, H2, and H3. Applications
can replace its closed style group with their own selectors, target tags, and
attribute writers without allowing the command to reinterpret arbitrary layout
blocks.

The first lifecycle extension is `breaks.js`. It provides a CSS-defaulted,
optional toolbar toggle for presentation-only line-break marks. Its one
top-layer overlay never enters editable HTML and exercises editor-wide setup,
per-surface attachment, ShadowRoot style ownership, view-only commands, and
complete disposal.

The optional `unstyle.js` module adds a selection-only, staged remove-format
action. Its immutable policy is not tied to UI: the same ordered levels can
remove presentation cumulatively from a safely parsed paste/drop fragment.

External HTML processing has three distinct stages:

1. Security sanitizing accepts external HTML through safe, context-aware sinks.
   The implemented native adapter uses `Element.setHTML()` and fails explicitly
   when that safe sink is absent. This stage is needed only when RTE explicitly
   parses an HTML string rather than leaving insertion to the browser.
2. Optional Unstyle cleanup removes configured classes, styles, presentation
   attributes, and formatting wrappers without making security decisions.
3. Structural normalization enforces the application's editable HTML model,
   such as allowed blocks, nesting, attributes, and canonical markup.

The normal input path leaves paste/drop insertion native, records only elements
added during that input, removes their configured presentation, and then
normalizes their structure. `ExternalInput` optionally composes all three stages
before insertion and passes the browser's target range to `insertFragment`.

## Configuration and defaults

Most serializable behavior is configured through inheritable CSS custom
properties. This lets a stylesheet configure an editor family while each
`contenteditable` may override only what differs. `auto` selects the semantic
default for the host element. JavaScript configuration is reserved for values
that CSS cannot express, such as functions and policy modules.

Current controls cover UI mode and toolbar items, allowed elements, block and
Enter behavior, cleanup level and timing, optional visible line breaks, and an
optional external-import Unstyle level. Future modules will add contextual
plain-text import, selection presentation, and browser-policy overrides. Defaults must
make an unconfigured editor useful and produce structurally valid HTML:

- `ul` and `ol` hosts create and retain `li` children;
- paragraph-like and other inline-only hosts never gain block children;
- generic block containers use paragraphs as their default text blocks;
- table-related hosts follow their native HTML content model;
- nested editable hosts form explicit boundaries and are never normalized by
  their parent editor.

## Commands and range formatting

RTE does not use `document.execCommand()`. Commands are explicit algorithms
executed inside transactions. They inspect the current selection, split only
the necessary boundaries, transform the covered content, restore selection,
and normalize the affected scope.

A mark operation applies or removes a semantic element, class, attribute, style
declaration, or custom representation over a range. The algebra gives every
mark a policy type, serializable value, deterministic order, and directional
exclusions. The implemented generic range commands split selected boundaries,
reuse suitable inline elements when the adapter allows it, preserve selection
direction, and treat configured atomic elements and nested editors as
boundaries. They derive selection and structural caret state and toggle a mark
without `execCommand()`. Pending marks replace the next ordinary text input.
During IME composition they leave every native mutation untouched, track its
live start, and apply the override only after `compositionend`. Selection
movement still needs no additional listener. Exact mark-set commands resolve
exclusions, remove configured values absent from their target, and apply the
canonical result in one mapped operation. Canonical wrappers are ordered by the
same stable mark rank; redundant nesting and newly exposed equivalent siblings
are merged to a fixed point without crossing meaningful or atomic boundaries.
The shipped standard policies recognize semantic aliases, emit one canonical
tag, and remove their representation without dropping unrelated attributes.

Commands are registered per surface, expose execution and availability
independently of any UI, and declare which native `inputType` they replace. The
input pipeline prevents exactly those native behaviors and runs the command
inside one transaction. Active and mixed mark state use the same command
contract. Undo and redo operate on complete editor transactions rather than
individual incidental DOM mutations.

## Normalization

Normalization is driven by the host's HTML content model and replaceable editor
policy, not by a list of isolated browser fixes. Rules describe permitted
children, default blocks, equivalent elements, transparent wrappers, atomic
content, splitting, lifting, unwrapping, merging, and conversion. Attributes,
classes, and styles contribute semantic weight, so a meaningful wrapper is not
discarded merely because its tag is otherwise redundant.

Cleanup has three levels:

- `minimal` repairs only invalid structures and caret-critical browser debris;
- `structural` is the default and additionally canonicalizes the affected
  blocks, removes redundant wrappers, and merges equivalent neighbors;
- `canonical` recursively produces deterministic markup for an explicitly
  requested subtree or the whole editor.

Work is limited through dirty scopes:

- typing normalizes the smallest affected inline or block neighborhood after
  the input transaction;
- native paste/drop unstyles only observed added roots, then normalizes the
  insertion neighborhood; explicitly parsed rich input sanitizes first;
- commands normalize their touched nodes and necessary ancestors;
- external DOM mutations queue only their affected subtrees;
- blur, serialization, or an explicit cleanup command may request canonical
  normalization of the complete editor.

A scope expands only when a repair crosses its boundary. Normalization must be
idempotent, preserve meaningful content and selection, and never cross another
editable host.

## Input pipeline

`InputPipeline` is installed per surface and treats native editing as a DOM
mutation followed by explicit postcondition checks. It captures live
`beforeinput` target ranges, classifies paste and drop separately, defers work
during IME composition, normalizes the smallest useful block scope, and maps
the current selection through every repair. CSS controls which of `input`,
`paste`, `drop`, and `command` trigger cleanup. Nested editors remain isolated,
and disconnecting a surface tears down its listeners. Prevented native input
passes its `inputType`, text data, and target range unchanged to the replacing
command.

The pipeline deliberately does not read or trust clipboard and drag payloads.
For native paste/drop it observes newly added element roots, maps presentation
cleanup through the current selection, and then performs normal structural
cleanup. Classes and inline styles are removed by default; existing destination
content is untouched.
The optional `ExternalInput` boundary owns rich HTML first, uses a selected
sanitizer and optional Unstyle policy, then invokes the mapped
`insertFragment` command. Sanitizer failures keep native insertion prevented
and are reported as input-phase errors. Contextual plain-text/quotation import
remains open.

## Documentation and tests

Every production source currently has:

- its own focused documentation describing purpose, public contract,
  invariants, browser considerations, examples, and concrete TODOs;
- a dedicated, comprehensive test file covering its public behavior, boundary
  cases, cleanup, and relevant browser differences.

Cross-browser integration scenarios complement those per-file tests. Tests run
against real browser editing behavior; DOM emulation alone is not considered
sufficient for selection and input semantics.

The dependency-free visual playground at `playground/` runs the same planner,
normalizer, point mapping, range, input, and mark-command code as production. It
can inspect invalid DOM structures and visualize class and bold mark behavior,
pending caret input, and the roaming toolbar on a live selection.

The current suite combines fixture tests, direct event integration tests,
seeded generated cases, and browser-regression cases. Later command, clipboard/drop, generated DOM/range,
and history phases add trusted interactions and their exact invariants. Across
all phases, core invariants include valid host structure, idempotent
normalization, stable canonical output, equivalent results for forward and
backward selections, preserved selection intent, complete cleanup, and exact
transactional undo/redo.

## TODO

- Add contextual plain-text/quotation import.
- Define a link-control module only after its URL-entry and validation contract.
- Exercise the new synchronous extension lifecycle with another contextual UI
  before adding dependency, ordering, or asynchronous setup concepts.
- Build the browser test matrix for current Chromium, Firefox, and WebKit.
- Port only the proven ideas from `../rte0`; keep its implementation untouched.

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

