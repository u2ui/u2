# U2 Issues (Gemini Review)

Findings spotted during code review that are not already tracked in `TODO.md` or `u2/plan-scoped-refactoring.md`.

## Open for discussion

- **[css/classless/variables.css:37](css/classless/variables.css#L37):** `--line-height: calc(var(--line-height-absolute) + var(--line-height-relative));` references `--line-height-absolute` and `--line-height-relative`, which are only defined by the stylers ([el/system/styler.js:250](el/system/styler.js#L250): 1.5em + .5rem, [u2/tools/variable-styler.js:27](u2/tools/variable-styler.js#L27): 1em + .5rem), making `--line-height` invalid by default when `variables.css` is loaded. Needs a decision on the default values.
- **[attr/skin/skin.css:22](attr/skin/skin.css#L22), [L30–32](attr/skin/skin.css#L30-L32), [L39](attr/skin/skin.css#L39):** Broad `:has(>&)` selectors in `[u2-skin=invert]` and `[u2-skin=theme]` may cause expensive style recalculations. `[u2-skin]:has(>&)` has a red `outline` as a dev warning ("invert can not be child of skin") – keep or remove?
- **[css/utils/utils.css:39](css/utils/utils.css#L39):** `.u2-hitBig::after` (marked "idea") has a visible tint `background:#f001;` – leftover or intended visualisation?
- **[el/carouselnav/carouselnav.js:35](el/carouselnav/carouselnav.js#L35) vs [el/carousel/carousel.js:358](el/carousel/carousel.js#L358):** Attribute name mismatch — `u2-carouselnav` looks up `sync-group`, while `u2-carousel` uses `sync`.
- **[attr/store/store.js:22](attr/store/store.js#L22), [L29](attr/store/store.js#L29):** A `<form u2-store>` without `id` saves to `u2-store-form-_noid_` on `input`, but `elObserver` checks `el.tagName === 'FORM' && el.id`, so it never restores and instead falls through into the global-input `else` branch.
