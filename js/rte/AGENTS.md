# RTE2 Agent Instructions

These instructions apply to this directory and all descendants.

## Project status — important

RTE2 is new and not used in production or by downstream consumers yet. There
is no backward-compatibility obligation. Prefer the clean final API and remove
superseded names or designs instead of adding aliases, deprecations, shims, or
legacy layers. Existing behavior still needs tests, but compatibility with an
earlier RTE2 draft is not a reason to keep a weaker design.

## Start here

- Read [`README.md`](./README.md) for the architecture and requirements.
- Read [`PLAN.md`](./PLAN.md) for implemented phases and the next responsibility.
- Read the README beside every responsibility you change.
- Treat `../rte` as a read-only behavioral reference. Never modify it or any
  other file outside `rte2` while working on RTE2.

## Priorities

- Keep changes focused, compact, readable, and internally consistent.
- Prefer a small general solution to a collection of special cases. RTE2 is a
  generic engine and must support use cases that were not anticipated.
- Treat reported examples as regression cases for a general rule. Do not ship
  tag-, class-, fixture-, or browser-specific behavior when the underlying
  concept can be expressed by configuration, the content model, or a reusable
  primitive.
- KISS and YAGNI apply, but every contract must remain composable, replaceable,
  and extensible.
- Shipped defaults are useful starting points, never fixed policy. Applications
  may replace them.
- Fix obvious, local, undisputed defects encountered in the discussed area.
  Do not expand work into subjective or speculative cleanup.
- Preserve existing comments and debugging functions unless their removal was
  explicitly requested.

## Architecture

- Use native `contenteditable`, `Selection`, `Range`, Input Events, and modern
  Web APIs. Do not build a parallel document model.
- Never use `document.execCommand()`.
- Keep one shared core per selection context as the normal architecture. A core
  may coordinate multiple editable surfaces and multiple roaming or static UIs.
- Mutable state belongs to its core, surface, transaction, or module instance.
  Module globals are only for immutable constants and stateless helpers.
- Nested editable hosts are isolation boundaries for events, selections,
  traversal, normalization, and commands.
- DOM mutations owned by the editor go through transactions and explicit point
  mapping. Preserve forward and backward selection intent.
- Keep responsibilities narrow. Content validity, repair planning, mechanical
  mutation, selection mapping, input routing, commands, history, sanitizing,
  browser policies, and UI remain separate modules.
- Later layers depend on public contracts, never private implementation details.
- Browser workarounds must be feature-detected, isolated near the affected
  primitive, and covered by a named regression test. Do not branch on user-agent
  strings.
- Security sanitizing and structural normalization are separate policies.
  Never pass untrusted HTML to unsafe DOM sinks.
- Scope normalization to the smallest affected subtree and expand only when a
  repair crosses that boundary. It must converge, be idempotent, and preserve
  meaningful content.

## Configuration

- Give every module safe, useful, host-aware defaults without requiring setup.
- Prefer inheritable CSS custom properties for serializable behavior. Use
  JavaScript configuration for functions, policy objects, and other values CSS
  cannot express naturally.
- Different editing hosts have different semantics. Lists, inline-only hosts,
  tables, generic blocks, atomic content, and nested editors must not be forced
  through one generic block rule.
- Use current browser standards; compatibility with obsolete browsers is not a
  goal. Modern CSS, including nesting, is allowed.

## Code style

- Code and code comments are English.
- Use standard ESM: `import`/`export`, `const`/`let`, classes, and functions. No
  IIFEs, `var`, prototype assignment, or accidental globals. Assign to
  `globalThis` only for deliberate compatibility or test instrumentation.
- Use clear, established, natural, preferably short names. One concept gets one
  term throughout the project.
- Avoid redundant API names: context already carries meaning (`module.add()`,
  not `module.addModule()`). Prefer symmetric names for symmetric operations.
- Keep control flow compact with small helpers and short early returns. Do not
  compress code until its intent becomes harder to see.
- Place related code together. Add a file only for a real responsibility,
  shared use, or separate testability—not merely to reduce line count.
- Remove middle-man helpers that only forward arguments without adding policy,
  validation, normalization, or composition.
- Do not hardcode application-specific tags, classes, commands, or policies in
  generic primitives.
- Use braces for multi-line and non-trivial control flow. Keep the local style
  consistent when changing existing code.
- Do not run broad automatic formatters. Never run `deno fmt` in this workspace.

## HTML and CSS

- Keep production presentation independent from the engine. UI modules consume
  editor state but do not become part of the core.
- Configure behavior through documented `--u2-rte-*` properties with good
  fallbacks.
- Keep the playground compact and diagnostic. It must call production modules,
  never contain a second implementation of editor behavior.
- Escape or sanitize user-controlled HTML with the selected sanitizing policy.
  Parsing a trusted test fixture is not a substitute for a safe external-input
  path.

## Documentation and tests

- Every production file has a dedicated comprehensive test file and focused
  documentation in its responsibility README.
- Every responsibility README documents purpose, public contract, invariants,
  browser considerations, and concrete TODOs.
- Update documentation and `PLAN.md` in the same change whenever a contract or
  implementation status changes. Do not describe planned behavior as existing.
- Tests cover normal behavior, boundaries, invalid input, cleanup, teardown,
  nesting, direction, cancellation, event order, and state isolation where
  relevant.
- A browser quirk becomes a minimal failing regression test before it becomes a
  policy.
- Tests leave no fixtures, selections, listeners, active cores, or other state
  behind.
- Do not weaken assertions, add timing guesses, or hide failures behind
  browser-specific skips. Test the stable contract and isolate genuinely
  engine-specific behavior.
- Run `/u2/js/rte2/tests/` through HTTP. A revision is cross-browser verified
  only when that exact revision passes in current Chromium, Firefox, and WebKit.
- Use `/u2/js/rte2/playground/` for visual inspection of normalization, mapping,
  selection, and input behavior.

## Before handing off

- Review the diff for unrelated changes, redundant code, naming consistency,
  cleanup, and stale documentation.
- Ensure every changed production responsibility has matching tests and docs.
- Report the exact browser revisions or engines actually tested. Never infer a
  cross-browser pass from one engine.
- Mention changes outside the discussed area prominently, with reason and
  effect.
