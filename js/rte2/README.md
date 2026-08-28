# RTE2

RTE2 is a modern, modular rich-text editing engine for current browsers. Its
small core owns editor state, transactions, selections, and ranges; everything
else plugs in as an independent module. A UI is only one possible consumer.

## Start here

Read this file for the design, then [`PLAN.md`](./PLAN.md) for implementation
status and the README beside the responsibility being changed for its exact
contract and TODOs. The current production path ends at the input pipeline;
marks and inline commands are the next responsibility.

Run the dependency-free browser suite at `/u2/js/rte2/tests/` and inspect
normalization interactively at `/u2/js/rte2/playground/`. The runner displays
its own test count and result. A result is cross-browser evidence only after
that exact revision has run in current Chromium, Firefox, and WebKit.

`../rte` is a read-only behavioral reference. Reuse proven behavior and CSS
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
- Pluggable HTML policy aligned with the native HTML Sanitizer API, with a
  DOMPurify adapter where the native API is unavailable. Applications may
  narrow elements and attributes without coupling security sanitizing to
  structural editor normalization.
- Deterministic tests for browser input, selection direction, range boundaries,
  DOM mutations, undo/redo, clipboard data, focus changes, and known engine
  differences.

## Module contract

A module declares only the capabilities it contributes and receives an editor
context during setup. It may register commands, event handlers, transforms,
normalizers, state derivations, or browser policies and must return its cleanup.
Module order and conflicts are explicit; no module reaches into another
module's private state.

Public behavior is event- and transaction-oriented. DOM mutations happen
through the editor transaction boundary so ranges can be preserved and every
consumer observes one coherent change.

## Structure

Each responsibility owns its implementation, tests, and README. A responsibility
may grow into further nested modules without turning the root into a collection
of unrelated helpers.

```text
rte2/
├── rte.js                 Public API and default document core
├── config/                CSS configuration and semantic host defaults
├── core/                  Shared root lifecycle and surface registry
├── model/                 Replaceable HTML content rules and categories
├── normalize/             Pure repair planning and scoped DOM normalization
├── playground/            Visual planner and normalization inspection
├── surface/               State of one editable host
├── selection/             Selection and range primitives
├── transaction/           Atomic editing changes and dirty scopes
├── command/               Formatting and structural commands
├── input/                 beforeinput, paste, drop, and composition
├── ui/                    Roaming and static UI adapters
├── browser/               Feature-detected engine policies
└── tests/                 Cross-module and cross-browser suites
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
roaming UI follows the active surface. A static UI binds to one surface. Several
roaming and static UIs may coexist and expose different subsets of the same
commands.

HTML policy has two distinct stages:

1. Security sanitizing accepts external HTML through safe, context-aware sinks.
   It prefers native `Element.setHTML()` and `Sanitizer` support and can use a
   DOMPurify adapter with equivalent editor policy.
2. Structural normalization enforces the application's editable HTML model,
   such as allowed blocks, nesting, attributes, and canonical markup.

Neither stage is hardwired into the core; both are replaceable policies with
safe defaults.

## Configuration and defaults

Most serializable behavior is configured through inheritable CSS custom
properties. This lets a stylesheet configure an editor family while each
`contenteditable` may override only what differs. `auto` selects the semantic
default for the host element. JavaScript configuration is reserved for values
that CSS cannot express, such as functions and policy modules.

Current controls cover UI mode, block and Enter behavior, and cleanup level and
timing. Future modules will add command sets, allowed content, paste/drop
policy, selection presentation, and browser-policy overrides. Defaults must
make an unconfigured editor useful and produce structurally valid HTML:

- `ul` and `ol` hosts create and retain `li` children;
- paragraph-like and other inline-only hosts never gain block children;
- generic block containers use paragraphs as their default text blocks;
- table-related hosts follow their native HTML content model;
- nested editable hosts form explicit boundaries and are never normalized by
  their parent editor.

## Commands and range formatting

RTE2 does not use `document.execCommand()`. Commands are explicit algorithms
executed inside transactions. They inspect the current selection, split only
the necessary boundaries, transform the covered content, restore selection,
and normalize the affected scope.

A common mark operation applies, removes, or toggles a semantic element,
classes, attributes, style declarations, or a custom transformation over a
range. It works across partially selected text and multiple blocks, handles
collapsed selections as pending input state, and treats configured atomic
elements as indivisible. Equivalent adjacent wrappers are merged; empty,
redundant, and conflicting wrappers are removed. Formatting must not leave DOM
shape dependent on the direction in which the selection was made.

Commands expose execution, availability, and active/mixed state independently
of any UI. Undo and redo operate on complete editor transactions rather than
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
- paste and drop sanitize before insertion, then normalize the inserted
  fragment and its insertion block;
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
and disconnecting a surface tears down its listeners.

The pipeline deliberately does not read or trust clipboard and drag payloads.
Future sanitizer adapters insert approved fragments before handing the affected
range to this same normalization path.

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
normalizer, point mapping, and range code as production. It can inspect or step
through invalid DOM structures that the HTML parser would repair before an
editor could observe them.

The current suite combines fixture tests, direct event integration tests, and
browser-regression cases. Later command, clipboard/drop, generated DOM/range,
and history phases add trusted interactions and their exact invariants. Across
all phases, core invariants include valid host structure, idempotent
normalization, stable canonical output, equivalent results for forward and
backward selections, preserved selection intent, complete cleanup, and exact
transactional undo/redo.

## TODO

- Specify the native Sanitizer and DOMPurify adapter contract.
- Specify mark algebra and replacement rules for tags, classes, attributes,
  styles, and custom range transforms.
- Integrate scoped normalization into the forthcoming command transactions.
- Add generated normalization convergence and point-mapping cases.
- Build the browser test matrix for current Chromium, Firefox, and WebKit.
- Port only the proven ideas from `../rte`; keep its implementation untouched.
