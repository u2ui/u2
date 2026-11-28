# U2 Issues (Gemini Review)

Findings spotted during code review that are not already tracked in `TODO.md` or `u2/plan-scoped-refactoring.md`.

## Open for discussion

- **[css/classless/variables.css:37](css/classless/variables.css#L37):** `--line-height: calc(var(--line-height-absolute) + var(--line-height-relative));` references `--line-height-absolute` and `--line-height-relative`, which are only defined by the stylers ([el/system/styler.js:250](el/system/styler.js#L250): 1.5em + .5rem, [u2/tools/variable-styler.js:27](u2/tools/variable-styler.js#L27): 1em + .5rem), making `--line-height` invalid by default when `variables.css` is loaded. Needs a decision on the default values.
- **[attr/skin/skin.css:22](attr/skin/skin.css#L22), [L30–32](attr/skin/skin.css#L30-L32), [L39](attr/skin/skin.css#L39):** Broad `:has(>&)` selectors in `[u2-skin=invert]` and `[u2-skin=theme]` may cause expensive style recalculations. `[u2-skin]:has(>&)` has a red `outline` as a dev warning ("invert can not be child of skin") – keep or remove?
- **[css/utils/utils.css:39](css/utils/utils.css#L39):** `.u2-hitBig::after` (marked "idea") has a visible tint `background:#f001;` – leftover or intended visualisation?
- **[el/carouselnav/carouselnav.js:35](el/carouselnav/carouselnav.js#L35) vs [el/carousel/carousel.js:358](el/carousel/carousel.js#L358):** Attribute name mismatch — `u2-carouselnav` looks up `sync-group`, while `u2-carousel` uses `sync`.
- **[theme/*/theme.css](theme/brutalist/theme.css#L6-L8):** Themes still define `--hsl-h`, `--hsl-s`, `--hsl-l`, but [css/classless/variables.css](css/classless/variables.css#L4-L9) no longer derives `--color` from them. Only some themes still use them for their own colors (e.g. `--hsl-s` in [theme/tech/theme.css:20](theme/tech/theme.css#L20), `--hsl-h` in [theme/soft/theme.css:20](theme/soft/theme.css#L20)) – derive `--color` again or remove the leftovers?
- **[el/system/styler.js:484](el/system/styler.js#L484), [u2/tools/dev-iframe.js:107](u2/tools/dev-iframe.js#L107):** Inline `onclick="..."` handlers in Shadow DOM markup are blocked by strict CSP without `'unsafe-inline'`.
- **[el/ico/ico.js:152](el/ico/ico.js#L152):** `cachedRequests[url]` permanently caches rejected `fetch` promises, so a transient error breaks that icon for the rest of the session. Dropping rejected promises means retrying on every render for permanently missing icons (404) – trade-off.
