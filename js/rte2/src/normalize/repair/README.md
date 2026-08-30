# Repair planning

The repair planner looks at one parent and one direct child and describes how an
invalid relationship should be fixed. Text directly in a `ul`, for example,
may need an `li` wrapper. A valid paragraph inside a `div` needs no action.

`repair-planner.js` only makes this decision. It returns an immutable action
without changing nodes, selections, or transaction state.

## Actions

- `keep`: the relationship is valid or cleanup is disabled.
- `boundary`: the child is an explicit nested editable and must not be crossed.
- `wrap`: place the child in the returned structural tag.
- `convert`: replace a neutral generic block with the configured default block.
- `unwrap`: remove a neutral wrapper while preserving its children;
  `breaks` records whether adjacent phrasing content needs explicit line breaks.
- `lift`: move the child to the nearest permitted ancestor inside the root.
- `remove`: discard only ignorable whitespace/comments or an empty neutral,
  non-atomic invalid wrapper.
- `reject`: no lossless default repair is known; execution must leave the node
  untouched or delegate to an application policy.

## Contract

- `none` never plans changes. `minimal` repairs invalid relationships only.
  `structural` and `canonical` additionally shape direct root content.
- The configured root block wraps direct phrasing content, converts neutral
  generic blocks containing phrasing content, and removes neutral generic
  wrappers around root blocks mixed with content that can be shaped at the
  root. A nested `<div>` followed by text can therefore become two sibling
  paragraphs through repeated small repairs.
- Root shaping requires a root block the root itself permits, and a generic
  block that already is the root block is never converted into itself. Both
  keep root repairs convergent instead of undoing each other.
- Parent rules may provide `defaultChild` for structures such as lists, table
  sections, and rows.
- Attributes make a wrapper meaningful. Such an element is lifted when a safe
  ancestor exists and is never silently unwrapped or converted.
- Explicit nested `contenteditable` elements and atomic elements are never
  removed by generic empty-node logic.
- Cached detached elements make repeated category checks allocation-free after
  the first use; they are inspection prototypes, never inserted into the DOM.

The separate `RepairExecutor` applies these actions through `PointMap`. The
scoped `Normalizer` groups compatible plans, repeats them to a fixed point,
preserves registered points, and reports dirty scopes to an optional
transaction.

## TODO

- Add policy hooks for application-specific generic and meaningful wrappers.
- Make line-boundary planning configurable for non-HTML output policies.
- Distinguish whitespace that is author content from formatting whitespace.
- Add sibling-sequence repairs once the content model exposes ordered rules.
- Define safe fallback policies for `reject` without hiding content loss.
