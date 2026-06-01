# Review – Inkonsistenzen & Fehler

Systematischer Durchgang durch `el/`, `attr/`, `class/`, `css/`, `js/` und die Tools.
Hinweis: README-Teile (Usage/Install/Demos/About) werden von `u2/tools/update.repos.json.js`
generiert – **H1 und Intro/Beschreibung sind dagegen handgepflegt** und werden vom Generator
nur durchgereicht. Fehler dort bleiben darum bestehen.

---

## A. manifest.json – `declarations[].name` / `exports[].declaration.name` uneinheitlich

Bei `el/` ist die Namens­konvention für das `name`-Feld völlig uneinheitlich. `tagName` ist
überall korrekt `u2-x`, aber `name` ist mal das Tag, mal der bloße Name, mal camelCase, mal
PascalCase, mal zusammengeschrieben:

| Komponente | `declarations[].name` | `exports[].declaration.name` | Anmerkung |
|---|---|---|---|
| alert, bytes, calendar, cookiebanner, copy, counter, drawer, ico, masonry, number, out, time | `u2-alert` … | meist `u2-…` | Tag-Stil |
| accordion, carousel, code, input, skeleton, table, tabs, textfit, tooltip, tree | `accordion`, `carousel`, `code`, `input`, … | `accordion`, `code`, `table`, … | bloßer Name |
| qrcode | `u2Qrcode` | `u2Qrcode` | camelCase |
| breadcrumb, responsive | `U2Breadcrumb`, `U2Responsive` | dito | PascalCase |
| buttongroup | `U2ButtonGroup` | `U2ButtonGroup` | **Casing falsch** – Klasse heißt `U2Buttongroup` (kleines g) |
| rating, splitpanel | `u2rating`, `u2splitpanel` | `u2rating`, `u2splitpanel` | zusammengeschrieben |

**Eindeutige Fehler (Template-/Copy-Paste-Reste):**
- `el/typewriter/manifest.json`: `declarations[].name = "carousel"` und
  `exports[].declaration.name = "MyElement"` → beides falsch, gehört zu `u2-typewriter`/`U2Typewriter`.
- `el/ico/manifest.json`: `exports[].declaration.name = "uIco"` (sonst `u2-ico`).
- `el/carousel/manifest.json`: `exports[].declaration.name = "carousel"` (bloßer Name).

> Empfehlung: einheitlich auf den JS-Klassennamen (`U2Typewriter`, `U2Alert`, …) setzen,
> da das in der Custom-Elements-Manifest-Spec für `declaration.name` üblich ist.

`attr/`-Manifeste sind hier konsistent (`u2-behavior`, `u2-confirm`, …).

---

## B. README – H1 / Escaping

- **`el/responsive/README.md`**: H1 lautet `# &lt;u2-rating&gt; - element` → falsches Element
  (Copy-Paste aus rating). Sollte `u2-responsive` sein.
- **`el/calendar/README.md`**: nutzt **unescaptes** `# <u2-calendar> - element  (BETA)`, während
  alle anderen `&lt;u2-…&gt;` schreiben. Außerdem als einzige mit inline „(BETA)" im H1.

Diese H1-Zeilen werden vom Generator nicht normalisiert (siehe F), daher persistent.

---

## C. Fehlende manifest.json

`el/` ohne manifest.json (29 haben eine, 12 nicht):
`carousel-nav, chart, fields, maintitlebar, menubutton, pagination, parallax-bg, rte, spot, system, toc, video`

`attr/` ohne manifest.json:
`dropzone, lightbox, movable, parallax, scrollspy, selectable, skin, store`
(Nur `behavior, confirm, disableif, draghandle, focusgroup, href, intersect, navigable` haben eine.)

---

## D. `el/system/styler.js` – Ausreißer

- Klasse heißt `ColorSystemStyler` statt `U2*` wie überall sonst.
- Wird **nicht** `export default` (einziges el-Modul ohne Export der Element-Klasse).
- Registriert als `u2-system-styler`, aber nirgends dokumentiert (fehlt in Skill & `projects.json`).

---

## E. `attr/navigable` – Migration halb fertig

Zwei parallele Observer-Implementierungen, beide in `navigable.js` importiert/benutzt:
- `TargetObserver.js` – alt, hash-basiert (`location.hash`, `hashchange`), Klasse `TargetObserver`.
- `U2TargetObserver.js` – neu, query-param-basiert (`?u2-target=…`, `popstate`), Klasse `U2TargetObserver` + `toggleParam`.

Inkonsistente Benennung (mit/ohne `U2`-Prefix) und doppelte Logik. Der alte Pfad sollte
vermutlich abgelöst/entfernt werden.

---

## F. `u2/tools/update.repos.json.js` – Generator-Schwächen

- **`projects.json` wird in der `forEach`-Schleife je Kategorie geschrieben** (Z. 30–33, vom
  Autor selbst als Bug kommentiert) → 6 redundante, race-anfällige Writes statt einem am Ende.
- **beta/deprecated-Erkennung** (`description.includes('beta')`, Z. 23–24) liest nur die
  Beschreibungs­zeile (README-Zeile 2). Dadurch:
  - `calendar` (BETA steht im H1) und `rte` („alpha") werden in `projects.json` **nicht** als beta
    geflaggt → Widerspruch README ↔ projects.json.
  - Substring-Match ist fragil (jedes „beta" irgendwo im Text triggert).
- **`repoH1()` ist auskommentiert** (Z. 201–207) – die Funktion, die den H1 normalisieren würde.
  Deshalb bleiben Fehler wie B (responsive) unentdeckt/unkorrigiert.
- **Split-Regex `text.split(/[\n^]#{1,2} /)`** (Z. 50): `^` in der Zeichenklasse ist ein
  **literales Caret**, kein Zeilenanfang-Anker. Funktioniert nur zufällig, weil der erste `# `
  an Position 0 kein vorangehendes `\n` hat. Fragil/irreführend.
- **Tote Funktion `zzzinstallPart`** (Z. 154–175) – durch `installPart` ersetzt, aber nie entfernt.

---

## G. Sonstiges / kleinere Punkte

- `js/rte/rte.js` ist nur ein 128-Byte-Shim; eigentlicher Code in `src/`, dazu ein `old/`-Verzeichnis.
  Weicht vom „ein `name.js` pro Modul"-Muster ab (Install-Generierung greift hier nicht sauber).
- `el/calendar` definiert zwei Elemente (`u2-calendar`, `u2-calendaritem`); `U2CalendarItem`
  ist nicht exportiert (nur `U2Calendar` per default) – ok, aber im Manifest nicht erfasst.
- Viele „Altlasten"-Bäume unter `u2/old-stuff/`, `js/rte/old/`, `el/ico/font/old/` – falls bewusst,
  ggf. kennzeichnen/ausschließen.
