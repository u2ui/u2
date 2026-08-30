# Browser policies

Browser policies compensate for observable differences in native editing,
selection, and layout primitives. This directory is not a general `fixes.js`:
each policy has one named responsibility, no hidden global state, and a focused
regression suite. Semantic editing behavior remains in commands, normalization,
or UI rather than being mislabeled as a browser fix.

## Range geometry

`range-rect.js` exports `rangeRect(range, {root})`. A native rectangle with a
rendered size or a non-zero position is returned unchanged. When a collapsed
range reports an entirely zero rectangle, the
function derives its caret edge from following content, preceding content, or
the nearest rendered ancestor inside `root`, in that order.

- The DOM and live selection are never mutated; no temporary marker is inserted.
- Text is measured with a temporary native range over one adjacent character.
- Element boundaries use descendant content first and the element box second.
- Returned fallbacks have zero width at the inferred caret edge and retain the
  measured line or element height.
- `root` is optional, but when supplied it both validates ownership and bounds
  ancestor fallback.
- The implementation uses observed geometry, not browser names or user-agent
  branches.

## Placement of future policies

A new file belongs here only when current engines expose different or unusable
native behavior below editor semantics. Content structure belongs to the model
and normalizer; key meaning belongs to commands/input; focus visibility belongs
to UI. Prefer feature detection and a narrow primitive that higher layers can
replace or omit.

## TODO

- Verify collapsed text, filler, replaced-element, vertical-writing, zoom, and
  Shadow DOM geometry in current Chromium, Firefox, and WebKit.
- Add policy composition only after two independent policies need shared
  installation or teardown; do not introduce a global fix registry in advance.
