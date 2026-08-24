# Scoped u2: mehrere u2-Versionen auf einer Seite

**Ziel:** Ein CMS-Panel (oder jedes andere eingebettete UI) läuft mit *seiner* u2-Version in
*seinem* Shadow-Root, unabhängig davon, welche u2-Version die Kundenseite lädt. Grundlage sind
Scoped Custom Element Registries — Chrome/Edge 146+, Safari 26+, Firefox noch nicht.

---

## Stand (1.5.3)

**Funktioniert.** Das Panel kann u2-Elemente benutzen, ohne dass auf der Kundenseite etwas kaputt
geht — auch wenn beide eine andere u2-Version fahren.

| Datei | Rolle |
|---|---|
| [`u2/enhance.js`](enhance.js) | scannt einen Root, lädt Elemente/Klassen/Attribute nach, registriert sie in **dessen** Registry. `attachShadow(host, opts)` als Convenience. Ein `MutationObserver` hält es aktuell — dieselbe Mechanik wie `auto.js`, nur ohne globale Nebenwirkungen. |
| [`u2/Element.js`](Element.js) | Basisklasse. `attachShadow()` belegt `customElementRegistry` vor, `useEl`/`useClass`/`useAttr` holen Kinder samt CSS ins eigene Shadow. Hängt an nichts. |
| [`u2/auto.js`](auto.js) | unverändert im Verhalten, benutzt intern `enhance` |
| [`u2/tests/enhance.test.html`](tests/enhance.test.html) | Browser-Test, 35 grün, 1 bekannte Lücke |

`enhance` bindet `css/norm/norm.css` und `css/base/base.css` automatisch ein. Elemente definieren
sich weiterhin selbst global, aber mit Guard (`customElements.get(tag) || define(...)`) — deshalb
wirft eine zweite u2-Version nicht mehr.

### Zwei Regeln, die daraus folgen

**1. Wer ein u2-Element in sein eigenes Shadow rendert, erbt von `U2Element`.** Das ist keine
Migration — von 41 Elementen tun das genau sechs: `alert`, `accordion`, `calendar`, `rating`
(je `ico`), `input` (`ico`, `bytes`, `badge`) und `fields` (`responsive`). Die übrigen 35 öffnen
entweder kein Shadow oder rendern nichts von u2 hinein.

**2. Kind-CSS gehört in den Root, in dem das Kind steht.** u2-Elemente haben meist *kein* eigenes
Shadow — `ico` schreibt sein SVG ins Light DOM, und `ico.css` stylt `u2-ico { … }` von aussen. Ein
Kind kann sich nicht selbst stylen, der Vater muss die CSS holen. Das macht jetzt `use*()`.

### Warum keine Deklaration am Element

Ein `static hasCss` müsste erst per JS geladen werden, bevor die CSS überhaupt startet — es macht
den wichtigeren Request garantiert langsamer. `projects.json` wäre ebenfalls erst ein Fetch (und ist
Enhance-Territorium). Also beides parallel und bedingungslos; die Defaults kommen aus der Kategorie:

| | js | css | Dateien im Repo |
|---|---|---|---|
| `el` | ja | ja | js 41/41, css 37/41 |
| `class` | **nein** | ja | js 0/8, css 8/8 |
| `attr` | ja | **nein** | js 15/16, css 1/16 |

Ausreisser gehören an die Aufrufstelle, nicht als Feld an alle 41 Elemente:
`useAttr('skin', {css:true, js:false})`. `skin` bleibt dauerhaft ein Attribut, weil es einen Wert
trägt — als Klasse ginge das erst mit einem Selektor wie `.u2-class-*`.

`v1.5.3` ist veröffentlicht; qino zeigt darauf — beide Pins,
[`qino/deno.json`](../../qinojs/qino/deno.json) und `core/lib/util.ts`, ein Test wacht über den
Gleichlauf. `deno check --all qino/` ist grün.

---

## Offen

### 1. Attribute — der eigentlich ungelöste Teil

Elemente sind isoliert, Attribute nicht. Ein Attribut-Modul hängt beim Auswerten Listener ans
`document`:

```js
document.addEventListener('click', e => { … e.composedPath()[0].closest('[u2-confirm]') … });
```

Der Radius ist enger als es klingt: ein Attribut wirkt nur auf Elemente, die seinen Namen tragen.
Hat die Kundenseite kein `u2-confirm`, merkt sie von der Panel-Nutzung nichts. Drei echte Risiken,
nach Schwere:

**a) `draghandle` verändert die Kundenseite bedingungslos.** [`attr/draghandle/draghandle.js:1`](../attr/draghandle/draghandle.js)
importiert statisch einen Fremd-Polyfill von `bernardo-castilho.github.io` — ein Drittanbieter-Script
auf einer fremden Seite, plus CSP-Problem. Das CSS daneben ist harmlos, es hängt an
`[u2-draghandle]`. **Im Panel bis auf Weiteres meiden.**

**b) Doppelinstallation.** Lädt die Kundenseite dasselbe Attribut aus ihrer Version, hängen zwei
Listener-Sätze am Dokument → doppelte Confirm-Dialoge, doppelte Drops. Der realistische Alltagsfall.

**c) Version-Hijack.** Wer zuerst lädt, gewinnt — wie bei Elementen vor Phase 3.

**Billiger Zwischenschritt (nicht breaking, ~16 Einzeiler):** ein Idempotenz-Guard pro Attribut, das
Gegenstück zu `customElements.get()` — ein Symbol am `document`, die zweite Kopie installiert nicht.
Erledigt (b) vollständig; aus „zwei kaputte Kopien" wird „eine funktionierende". (c) bleibt.

**Richtige Lösung (1.6.0):** Attribute exportieren `install(root)` statt sich selbst zu installieren,
`useAttr` installiert in den Root. **Der Haken:** fünf von ihnen — `confirm`, `dropzone`,
`draghandle`, `movable`, `selectable` — benutzen `composedPath()` *absichtlich*, um über
Shadow-Grenzen hinweg zu arbeiten. Für die ist „der Root" nicht die richtige Grenze. Das geht Modul
für Modul und ist eine Design-, keine Fleissarbeit.

**Nebenbefund, unabhängig davon:** manche Attribute funktionieren im Shadow-DOM *heute schon* nicht
sauber. `dropzone` sucht seine Zonen per [`document.querySelectorAll('[u2-dropzone]')`](../attr/dropzone/dropzone.js#L17),
was in einen Shadow-Root nicht hineinsieht — die Events kommen per `composedPath` an, die
Buchhaltung nicht.

### 2. Phase 3 — Selbstregistrierung entfernen (die letzte Lücke)

Die eine verbleibende rote Zeile im Browser-Test: `el/ico/ico.js` registriert sich weiterhin in
`window.customElements`.

**Was es bringt:** Ladereihenfolge wird egal. Heute gilt: lädt das **Panel zuerst**, definiert es
`u2-ico` aus seiner Version global; danach sieht das u2 der Kundenseite den Namen belegt,
überspringt still — und **die Kundenseite bekommt die Panel-Version**. Kein Fehler, kein Hinweis.
Umgekehrt (Kunde zuerst) ist alles korrekt.

**Was es kostet:** nicht die 16 Repo-Seiten, die ein Element-JS direkt per Script-Tag laden
(98 weitere gehen über `auto.js` und wären unberührt), sondern dass

```html
<script src="…/el/buttongroup/buttongroup.js" type=module async></script>
```

das **dokumentierte Installations-Snippet** ist — [`u2/tools/update.repos.json.js:159`](tools/update.repos.json.js#L159)
generiert es in jedes README. Neu wäre:

```html
<link href="…/el/buttongroup/buttongroup.css" rel=stylesheet>
<script type=module>
import U2Buttongroup from '…/el/buttongroup/buttongroup.js';
customElements.define('u2-buttongroup', U2Buttongroup);
</script>
```

Das ist der geplante 1.6.0-Break: 41 Dateien, plus READMEs und SKILL.md neu generieren.

### 3. CSS-Reihenfolge — zwei Wege, der zweite ist besser

Adoptierte Sheets kommen **nach** den Tree-Styles. `use()` macht darum `unshift` statt `push` — der
Kind-Sheet landet vorne, egal wann er eintrifft. Solange ein Vater sein CSS aber als Tree-`<style>`
im `innerHTML` hat, gewinnt die Kind-CSS bei Gleichstand trotzdem.

Ein echter Fall bestand: `fields` überschrieb `u2-responsive {display:block}` mit `display:grid`,
Gleichstand — jetzt `#container`. Bei `alert` und `accordion` war die Eltern-Regel höher
spezifiziert, dort war nichts zu tun.

**Weg A — die sechs `<style>`-Blöcke adoptieren.** Dann bestimmt die Array-Reihenfolge
`[kind, eltern]` das Ergebnis statt der Spezifität. Zweiter Gewinn: ein Sheet auf Modulebene wird
einmal geparst statt einmal pro Instanz — heute parst ein `u2-alert` seinen Style-Block bei jeder
Instanz neu. Mechanisch, sechs Dateien, jede optisch nachzuprüfen.

**Weg B — Element-CSS in einen Layer legen.** `@layer u2.el { … }` in `ico.css` & Co. Ungelayerte
Regeln schlagen gelayerte **immer**, unabhängig von Spezifität und Reihenfolge. Damit gewinnt jeder
Vater automatisch, ohne `unshift`, ohne Umbau der sechs, ohne Spezifitäts-Nachrechnen — und
Anwender-Overrides werden allgemein einfacher statt schwerer. Bestehende Overrides brechen nicht:
sie sind heute ungelayert und werden dadurch stärker, nie schwächer.

Der Haken, den es wirklich gibt: **die Layer-Reihenfolge muss einmal deklariert werden.** u2 hat
schon `@layer normalize` in `base.css`/`norm.css`; kommt `u2.el` dazu, entscheidet die
Erstbegegnung — und `enhance` adoptiert asynchron. Die Antwort ist billig: `enhance` adoptiert als
allererstes ein Mini-Sheet mit `@layer u2.norm, u2.base, u2.el, u2.class;`. Danach ist die Ordnung
in jedem Root festgelegt, egal in welcher Reihenfolge die Sheets eintreffen.

Zweiter Haken, kleiner: `!important` kehrt die Layer-Reihenfolge um, und Anwender, deren *eigenes*
CSS gelayert ist, konkurrieren dann nach Layer-Ordnung statt nach „ungelayert schlägt gelayert".
Beides selten, beides dokumentierbar.

**Weg B macht Weg A überflüssig** — bis auf den Parse-Gewinn, der ein eigener, unabhängiger
Optimierungsschritt bleibt.

### 4. Firefox

Ohne Scoped Registries fällt `enhance` auf `customElements` zurück und alles verhält sich wie
bisher — kein Fehler, aber auch keine Isolation. Fürs CMS-Panel bewusst als Voraussetzung gesetzt.
Wenn Firefox nachzieht, ist nichts zu tun.
