# Compact Code Findings

Systematischer Scan ueber das Repo per `rg --files` und gezielten Mustern fuer moderne JS-Vereinfachungen (`??=`, `||=`, optional calls, object spread, `Object.fromEntries`, `toggleAttribute`, doppelte DOM-Abfragen). Scope: 643 Dateien im Arbeitsbaum, ohne typische Dependency-/Build-Ordner. Es wurde kein Source-Code geaendert und kein Formatter ausgefuehrt.

## Gute Kandidaten

### `u2/auto.js`

- `u2/auto.js:143-146`: `Object.assign(allNeeded.js||{}, needed.js)` kann kompakter und nullish-korrekt mit `??=` werden.

```js
allNeeded = JSON.parse(allNeeded) ?? {};
Object.assign(allNeeded.js ??= {}, needed.js);
Object.assign(allNeeded.css ??= {}, needed.css);
```

- `u2/auto.js:77-89`: Index-Loops ueber `classList` und `attributes` koennen als `for...of` kuerzer werden.

```js
for (const klass of node.classList) { ... }
for (const attr of node.attributes) { ... }
```

- `u2/auto.js:108-114`: Der `MutationObserver` kann ebenfalls mit `for...of` lesbarer werden.

```js
for (const entry of entries) {
    for (const node of entry.addedNodes) newNodeRoot(node);
}
```

### `u2/tools/update.repos.json.js`

- `u2/tools/update.repos.json.js:11-37`: `forEach(async ...)` wird nicht awaited und die Datei wird pro Kategorie geschrieben. Der vorhandene Kommentar nennt den Bug schon. Mit `for...of` wird es kuerzer und korrekt: Kategorien nacheinander verarbeiten, danach einmal `projects.json` schreiben.

- `u2/tools/update.repos.json.js:53-58`: Destructuring spart Zwischenvariablen.

```js
const [firstLine, ...contentLines] = part.split('\n');
const title = firstLine.replaceAll('#', '').trim();
parts[title] = contentLines.join('\n').trim();
```

- `u2/tools/update.repos.json.js:96-98`: `for...of` passt hier besser als `Object.entries(...).forEach`, weil `content` mutiert wird.

- `u2/tools/update.repos.json.js:118-135`: Die optionalen `split(...)?[1]?.split?.(...)` Muster sind kompakt, aber uneinheitlich. Fuer `html` fehlt die Absicherung bei fehlender `<section>`. Entweder ueberall optional chaining oder kleine Helper-Funktion `between(code, startRegex, end)`.

### `el/cookiebanner/extensions/googleConsentMode.js`

- `el/cookiebanner/extensions/googleConsentMode.js:2`: Direktes `??=` wie an anderen Stellen im Repo.

```js
window.dataLayer ??= [];
```

- `el/cookiebanner/extensions/googleConsentMode.js:16-20`: `Object.fromEntries` ersetzt das manuelle Fuellen.

```js
const defaultConsent = {
    ...Object.fromEntries(Object.entries(googleConsentMap).map(([key, value]) => [
        key,
        value === 'necessary' ? 'granted' : 'denied'
    ])),
    wait_for_update: 700
};
```

### `js/PointerObserver/PointerObserver.js` und `js/PointerObserver/PointerObserver-no-scroll.js`

- `PointerObserver.js:7-11`: `Object.assign` kann object spread werden.

```js
this.options = {
    mouse: true,
    touch: true,
    passive: true,
    ...options
};
```

- `PointerObserver.js:65`, `114`, `128`: Callback-Aufrufe koennen optional calls werden.

```js
this.onstart?.(e);
this.onmove?.(e);
this.onstop?.(e);
```

- `PointerObserver.js:101-112`: Die zweite Gleichheitspruefung nach dem Setzen von `this.last`/`this.pos` ist redundant, weil dieselbe Bewegung vorher schon abgefangen wurde.

### `js/SelectorObserver/SelectorObserver.js`

- `SelectorObserver.js:127` und `136`: Optional calls.

```js
this._on?.(el);
this._off?.(el);
```

- `SelectorObserver.js:143`: `target.matches(...) && this._add(target)` ist kurz, aber ein `if` ist konsistenter mit den umliegenden guard clauses.

- `SelectorObserver.js:166-168`: Im Deep-Modus wird bewusst `querySelectorAll('*')` genutzt. Falls wirklich nur Treffer relevant sind, waere `querySelectorAll(this.selector)` deutlich kleiner und schneller. Der Kommentar fragt das schon an; vor Aenderung Verhalten gegen `_remove` pruefen.

### `el/ico/ico.js`

- `el/ico/ico.js:155-161`: Cache-Fuellung ist ein klassischer `??=` Kandidat.

```js
return cachedRequests[url] ??= fetch(url, {cache: 'force-cache'}).then(res => {
    if (!res.ok) throw new Error(`Failed to fetch icon ${url}: ${res.status} ${res.statusText}`);
    return res.text();
});
```

- `el/ico/ico.js:84-85`: `parseFloat(...) ?? 24` greift bei `NaN` nicht. Fuer fehlende SVG-Groessen ist das eher ein Bugfix als nur Kompakt-Code. Minimal:

```js
const width = parseFloat(svgEl.getAttribute('width')) || 24;
const height = parseFloat(svgEl.getAttribute('height')) || 24;
```

Oder strenger mit `Number.isFinite`, falls `0` nicht als fallback behandelt werden soll.

### `attr/store/store.js`

- `attr/store/store.js:4`: `cookieStore && cookieStore.get(...)` kann optional chaining werden.

```js
cookieStore?.get('u2-cookiebanner')
```

- `attr/store/store.js:19`, `26`, `36`, `49`: Wiederholtes `JSON.parse(store.getItem(key) || '{}')` kann ein kleiner Helper sein.

```js
const readStore = key => JSON.parse(store.getItem(key) ?? '{}');
```

- `attr/store/store.js:40-45` und `51-55`: Die Checkbox-/Value-Zuweisung kommt doppelt vor. Ein kleiner `restoreInput(input, value, markValue = false)` wuerde kuerzen.

### `attr/selectable/SelectionManager.js`

- `attr/selectable/SelectionManager.js:22`: Direkter `??=` Kandidat, ohne Semantikwechsel.

```js
if (item.ariaSelected === 'true') firstSelected ??= item;
```

### `attr/navigable/U2TargetObserver.js`

- `attr/navigable/U2TargetObserver.js:16-24`: `_matches` und Callback-Aufrufe koennen kompakter und mit klarerer Praezedenz formuliert werden.

```js
_matches(el) {
    return !!el && (this.opts.matches == null || el.matches(this.opts.matches));
}
_testOn(el) {
    if (this._matches(el)) this.opts.on?.(el);
}
```

- `attr/navigable/U2TargetObserver.js:46-49`: Die Set-Differenz kann als Helper wiederverwendet werden, falls dieses Muster noch an anderen Stellen auftaucht.

### `el/table/table.js`

- `el/table/table.js:79-80`: Drei DOM-Abfragen auf dieselbe Checkbox-Menge. Einmal cachen macht den Code kuerzer und schont DOM-Zugriffe.

```js
const checks = this.querySelectorAll(':scope > table > tbody > tr > td > input[type="checkbox"]');
const checked = this.querySelectorAll(':scope > table > tbody > tr > td > input[type="checkbox"]:checked');
const allChecked = checked.length === checks.length;
const noneChecked = checked.length === 0;
```

### `u2/utils.js`

- `u2/utils.js:53-59`: `WeakMap` wird zweimal gelesen. Mit lokaler Variable ist es kompakter und vermeidet `has` + `get`.

```js
let styleWrapper = styleWrappers.get(root);
if (!styleWrapper) {
    styleWrapper = document.createElement('div');
    root.prepend(styleWrapper);
    styleWrappers.set(root, styleWrapper);
}
return styleWrapper;
```

## Breitere Muster

- Optional calls: Mehrere Stellen nutzen `fn && fn(...)`, z.B. `js/dialog/dialog.js:51`, `js/rte/src/rte.js:9`, `attr/navigable/TargetObserver.js:43/64/65`. Moderne Variante: `fn?.(...)`.

- `Array.from(...)` bei Collections kann oft `[...collection]` werden, z.B. in Tests und einigen alten RTE-Dateien. Nur aendern, wenn Iterierbarkeit im Zielbrowser sicher ist.

- `Object.assign({}, data)` oder `Object.assign(defaults, options)` kann haeufig object spread werden. Vorsicht, wenn bewusst ein bestehendes Objekt mutiert wird.

- Boolean-Attribute: Fuer echte Boolean-Attribute kann `toggleAttribute(name, condition)` kuerzer sein als `condition ? setAttribute(...) : removeAttribute(...)`. In `attr/behavior/behavior.js:54-58` ist `setAttr` aber generisch und unterstuetzt auch String-Werte, daher nicht blind ersetzen.

- `old-stuff/` und `js/rte/old/` enthalten viele `var`, alte Loop-Formen und Legacy-Patterns. Kompakt-Modernisierung dort nur separat angehen, damit historische/kompatible Kopien nicht nebenbei semantisch veraendert werden.

## Nicht blind anwenden

- `||=` ersetzt nur dann sicher, wenn `''`, `0` und `false` wie “nicht gesetzt” behandelt werden duerfen. Sonst `??=` verwenden.
- `??` hilft nicht gegen `NaN`; bei Parsern wie `parseFloat(...)` explizit `Number.isFinite(...)` oder bewusst `||` nutzen.
- `forEach(async ...)` ist selten das, was man will. Wenn Reihenfolge oder Fertigstellung relevant ist, `for...of` mit `await`.
