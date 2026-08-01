# Scoped-Refactoring: isolierte u2-Instanzen (z.B. CMS-Panel)

## Ziel

Eine u2-Instanz **isoliert** in einem Shadow-DOM betreiben — konkreter Anwendungsfall: das CMS-Panel
soll seine **eigene** u2-Version laden, ohne `window.customElements` zu verschmutzen
oder mit der u2-Version der Host-Seite zu kollidieren.

Dazu müssen zwei Dinge zusammenkommen:

1. Element-Dateien registrieren sich **nicht mehr selbst global** (kein
   `customElements.define(...)` als Import-Side-Effect).
2. Registrierung läuft über eine **austauschbare Registry** — global
   (`window.customElements`) oder scoped (`new CustomElementRegistry()`), gebunden
   an einen ShadowRoot.

## Ausgangslage

- `el/{name}/{name}.js` definiert am Datei-Ende `customElements.define('u2-{name}', …)`
  als Side-Effect.
- [`u2/auto.js`](auto.js) beobachtet das DOM per `MutationObserver`, importiert bei
  Gebrauch das passende Modul und verlässt sich darauf, dass **der Import** das Element
  global registriert.
- **43 von 44** Element-Dateien sind bereits 1:1 `el/{name}/{name}.js` → `u2-{name}`
  und exportieren `export default class`.
- Sonderfälle:
  - [`el/calendar/calendar.js`](../el/calendar/calendar.js) definiert **zwei** Elemente
    (`u2-calendar` + `u2-calendaritem`); `U2CalendarItem` ist aktuell **nicht** exportiert.
  - [`el/system/styler.js`](../el/system/styler.js) → `u2-system-styler` (Tag ≠ Ordnername,
    wird nicht über auto.js geladen).
- Einige Elemente rendern **andere** u2-Elemente in ihr eigenes Shadow-DOM und
  verlassen sich auf den globalen Side-Effect, z.B.
  [`el/accordion/accordion.js`](../el/accordion/accordion.js) → `import('../ico/ico.js')`,
  ebenso `buttongroup`→`focusgroup`, `fields`→`responsive`, `rating`→`ico`.

## Zielarchitektur

### `U2Auto` — Factory statt globalem Modul-Side-Effect

Der MutationObserver-Mechanismus aus [`u2/auto.js`](auto.js) wird zu einer Klasse,
die eine **Registry** und einen **Root** kapselt. Beim Erkennen eines Elements
importiert sie das Modul und registriert es **selbst** aus den Exports — statt sich auf
den Side-Effect zu verlassen.

```js
class U2Auto {
  // registry defaults to the shadow's own registry, else the global one
  constructor(root, registry = root.registry ?? customElements) {
    this.root = root;
    this.registry = registry;
    this.mo = new MutationObserver(entries => {
      for (const entry of entries)
        for (const node of entry.addedNodes) this._newNodeRoot(node);
    });
    this.mo.observe(root, { childList: true, subtree: true });
    this._newNodeRoot(root);
  }

  async _loadEl(name) {
    const tag = 'u2-' + name;
    if (this.registry.get(tag)) return;
    const mod = await import(rootUrl + 'el/' + name + '/' + name + '.js');
    if (!this.registry.get(tag)) this.registry.define(tag, mod.default);
    for (const [t, cls] of Object.entries(mod.extraElements ?? {}))
      if (!this.registry.get(t)) this.registry.define(t, cls);
  }
  // … _newNode / _newNodeRoot / class + attr handling wie bisher
}
```

- **Global** (heutiges Verhalten): beim Laden von `auto.js` wird automatisch
  `new U2Auto(document.documentElement)` erzeugt → Registry = `customElements`.
- **Scoped**: `new U2Auto(shadowRoot, scopedRegistry)` → registriert **nur** in dieses
  Shadow, `window.customElements` bleibt unberührt.

### Warum die Registry ein Parameter bleibt (nicht lazy ableitbar)

Eine scoped Registry wird **bei `attachShadow({ registry })` gebunden** und lässt sich
danach nicht mehr an einen bestehenden ShadowRoot hängen. Wenn U2Auto den ShadowRoot
bekommt, ist es zum *Erzeugen* der Registry längst zu spät.

- **Zurücklesen** geht über den nativen Getter `ShadowRoot.prototype.registry` → daher
  der Default `registry = root.registry ?? customElements`.
- Aber der Aufrufer muss die Registry **vorher** erzeugt und beim `attachShadow`
  mitgegeben haben. `el.shadowRoot ? new CustomElementRegistry() : customElements` wäre
  **falsch**: die dort neu erzeugte Registry ist mit nichts verdrahtet.
- Root-Typ-Check: `root instanceof ShadowRoot` (nicht `el.shadowRoot`, denn U2Auto
  bekommt den Root selbst, nicht den Host).

### Convenience-Helper zum Attachen

Da Registry-Erzeugung und `attachShadow` zusammengehören:

```js
function attachU2Shadow(host, opts = {}) {
  const registry = new CustomElementRegistry();
  const shadow = host.attachShadow({ mode: 'open', ...opts, registry });
  new U2Auto(shadow, registry);
  return shadow;
}
```

### `define()`-Helper — der zentrale Seam

Statt roher `customElements.define(...)`-Aufrufe eine geführte, idempotente Funktion:

```js
// u2/define.js
export function define(tag, cls, registry = customElements) {
  if (!registry.get(tag)) registry.define(tag, cls);
}
```

Der Guard macht Doppel-Registrierung harmlos (wichtig für die Übergangsphase, in der
sowohl U2Auto als auch der Datei-Side-Effect definieren können).

## Firefox / Scoped Custom Element Registries

- Native `attachShadow({ registry })`, `new CustomElementRegistry()` und der Getter
  `ShadowRoot.prototype.registry`: **Chrome/Safari ja, Firefox noch nicht.**
- Lösung: der offizielle Polyfill
  **`@webcomponents/scoped-custom-element-registry`**.
- **Wichtig:** der Polyfill **behält den Tag-Namen** bei (`u2-foo` bleibt `u2-foo`).
  Er renamed nicht, sondern patcht `attachShadow`, den `innerHTML`-Setter,
  `createElement`, `importNode` etc. und wendet im jeweiligen Scope den richtigen
  Konstruktor auf denselben Tag an.
  → **CSS `u2-foo {}` matcht weiterhin**, Shadow-`<style>` sowieso.
- Der „Name ändert sich / CSS bricht"-Fall gilt nur bei selbstgebautem Poor-man's-Scoping
  (`u2-foo-v2` pro Scope) — das machen wir **nicht**.
- Realkosten des Polyfills:
  - muss **vor** dem ersten scoped ShadowRoot geladen sein,
  - etwas Laufzeit-Overhead,
  - wenige Edge-Cases (`el.constructor`).
- Feature-Detection:
  ```js
  if (!('registry' in ShadowRoot.prototype))
    await import('.../scoped-custom-element-registry.min.js');
  ```
  Einmal am Anfang laden, danach funktioniert scoped überall gleich.

## CSS-Anmerkung

Komponenten-CSS liegt bereits im jeweiligen Shadow der Elemente (z.B. accordion
importiert `ico.css` in seinen eigenen ShadowRoot). Das globale `impCss` aus auto.js ist
nur für classless/utilities/base zuständig. Für ein scoped Panel entscheidet man separat,
ob und welche dieser globalen Stylesheets **in** das Panel-Shadow geladen werden — das ist
unabhängig vom Element-Registry-Thema.

## Interne Element-Deps (der harte Teil)

Elemente, die andere u2-Elemente in ihr **eigenes** Shadow rendern, dürfen sich nicht mehr
auf den globalen Side-Effect verlassen. In einer scoped Registry ist `u2-ico` sonst nicht
sichtbar.

**Umstellung** (registry-agnostisch, schon heute non-breaking):

```js
// vorher (Side-Effect)
import('../ico/ico.js');

// nachher (explizit + Guard)
import U2Ico from '../ico/ico.js';
define('u2-ico', U2Ico);
```

Betroffen u.a.: `accordion`→`ico`, `rating`→`ico`, `buttongroup`→`focusgroup`,
`fields`→`responsive`.

> Vollständig sauber wird das erst, wenn solche Kind-Elemente in **dieselbe** scoped
> Registry registriert werden wie das Eltern-Shadow. Für die erste Ausbaustufe (globale
> Nutzung) reicht die explizite `define()`-Umstellung; die scoped-Verkettung ist ein
> Folge-Schritt.

## Migrationsplan (phasenweise)

### Phase 1 — Additive Vorbereitung (non-breaking)

Ziel: alles vorbereiten, ohne bestehendes Verhalten zu ändern.

1. **`export default` überall garantieren** (fehlt nur in 3 Dateien).
   Sekundär-Klassen mit exportieren:
   ```js
   // el/calendar/calendar.js
   export const extraElements = { 'u2-calendaritem': U2CalendarItem };
   ```
2. **`u2/define.js`** anlegen (siehe oben).
3. **Datei-Enden umstellen**: `customElements.define('u2-foo', U2Foo)` → `define('u2-foo', U2Foo)`.
   Verhalten identisch (global), aber Registrierung läuft durch den Seam.
   → Codemod über die 44 Dateien.
4. **Interne Deps entkoppeln**: Side-Effect-Importe zwischen Elementen auf
   `import Cls; define('u2-x', Cls)` umstellen. Dank Guard harmlos-redundant, aber schon
   registry-agnostisch.
5. **`U2Auto`-Klasse** einführen; `auto.js` erzeugt die globale Default-Instanz
   (`new U2Auto(document.documentElement)`) und registriert aus den Exports statt aus dem
   Side-Effect.

Nach Phase 1: global unverändert, aber die gesamte Plumbing für scoped ist vorhanden.

### Phase 2 — Scoped-Betrieb ermöglichen

6. **Polyfill-Loader** + Feature-Detection einbauen.
7. **`attachU2Shadow(host)`** exportieren.
8. CMS-Panel: eigenes Shadow via `attachU2Shadow` erzeugen und dort die isolierte
   u2-Instanz laufen lassen.

### Phase 3 — Isolation scharf schalten (der einzige echte Break)

9. **Self-`define()` am Datei-Ende entfernen**, sodass ein direktes `import 'foo.js'`
   nicht mehr registriert. Erst dann leakt nichts mehr global.
   → Ein-Zeilen-Codemod pro Datei; auto.js/U2Auto definieren zu dem Zeitpunkt längst selbst.

> **Ehrlicher Haken:** *volle* Isolation im Panel gibt es erst mit Phase 3. Solange die
> Dateien sich selbst global definieren, leakt jedes im Panel geladene Element in
> `window.customElements`. Phase 2 lässt sich aber komplett fertig testen; nur die
> Leak-Freiheit kommt zuletzt.

## Breaking Changes & Migrationsanweisungen

Erst ab **Phase 3** relevant:

1. **`import 'u2/el/foo/foo.js'` definiert das Element nicht mehr** — nur noch der Export
   existiert. Grösster Bruch.
   - *Migration:* entweder auto.js verwenden (keine Änderung nötig), oder manuell:
     ```js
     import U2Foo from 'u2/el/foo/foo.js';
     customElements.define('u2-foo', U2Foo); // bzw. define(...) aus u2/define.js
     ```
2. **Inter-Element-Side-Effect-Importe** greifen nicht mehr (bereits in Phase 1 auf
   explizites `define()` umgestellt → kein Bruch, wenn Phase 1 gemacht wurde).
3. **`extraElements`** (calendaritem) muss explizit registriert werden (macht U2Auto).

## Offen / später

- **Scoped Attribute-Registry** (`u2-*`-Attribute isoliert): gleiche Factory-Idee wie
  `U2Auto`, aber eigener Mechanismus. Bewusst **später**, um den Scope hier klein zu halten.
- Scoped-Verkettung von Kind-Elementen in die Eltern-Registry (siehe „Interne Deps").
