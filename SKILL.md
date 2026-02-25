# u2 Framework

Modular web component framework.
https://github.com/u2ui/u2


## Categories

**`attr/`** - Add behavior via HTML attributes

- **behavior** - Assigns a predefined action to a button, e.g., behavior="share" (beta) *(beta)*
- **confirm** - Shows a confirmation dialog on clicks or before form submits and only proceeds if confirmed.
- **disableif** - Disable form-elements (like inputs, buttons, fieldsets) based on a condition
- **draghandle** - Defines a handle element to drag a `draggable=false` container.
- **dropzone** - Dropzone for draggable elements. <div u2-dropzone=":scope selektor">
- **focusgroup** - Enables arrow-key navigation between focusable elements in a container.
- **href** - Makes any element act as a link. `u2-href="url"`
- **intersect** - declarativ intersection-observer
- **lightbox** - Link an image to a lightbox. `<a u2-lightbox=group1 src="image.jpg">`
- **movable** - Make an element movable. Optionally define a [u2-movable-handler] element.
- **navigable** - Turns dialogs, details, etc. into link-navigable elements with history support.
- **parallax** - Makes elements scroll at different speeds for a parallax effect.
- **scrollspy** - Make a navigation that changes the `active` class based on the scroll position.
- **selectable** - Makes a container with selectable items. <div u2-selectable=".selector">
- **skin** - Scoped theme. `[u2-skin=myskin] { --color: red }` — derived tokens recalculate automatically. Sets `background-color: var(--color-bg)` and `color: var(--color-text)`.
- **store** - Persists form/input values using localStorage (form[id] / input[name] as keys)

**`class/`** - CSS-only utilities via class names

- **badge** - Rendering badges
- **card** - All children except img/video/hr have padding. Child with class="-body" fills space, last element is pushed down. 
- **flex** - Most wanted flexbox case
- **grid** - Most wanted grid case
- **reset** - A class to reset Styles (beta) *(beta)*
- **table** - Better tables
- **unstyle** - Unstyle elements e.g. buttons
- **width** - The main width of your layout

**`el/`** - Custom HTML elements (Web Components)

- **accordion** - Turns HTML structures with headings into an accordion, using the content between headings as each panel’s content.
- **alert** - Prominent hints, alerts and facts. `<u2-alert open variant=info>...</u2-alert>`
- **breadcrumb** - Breadcrumb from a list of links
- **buttongroup** - A container for grouping buttons together; buttons that don’t have space will be moved into a dropdown menu.
- **bytes** - Displays formatted bytes
- **calendar** - Calendar / month view component, use `<u2-calendaritem>` as children
- **carousel** - Simple carousel component
- **carousel-nav** - Carousel navigation element for u2-carousel. (beta) *(beta)*
- **chart** - Renders a chart from html like `<table>` or `<dl>` elements. `<u2-chart type="pie"><table>...`
- **code** - Code-blocks. <u2-code editable trim><style|textarea|script>...
- **cookiebanner** - Cookie banner for consent management.
- **copy** - Mirrors an element's content. `<u2-copy for="id" sync></u2-copy>`
- **counter** - Animated Number Counter
- **drawer** - (beta) *(beta)*
- **fields** - Every content before a form element is considered as label
- **ico** - Icon `<u2-ico icon="edit" aria-label="edit">🖉</u2-ico>` uses `html { --u2-ico-dir:'https://example.com/svg/{icon_name}.svg'`
- **input** - Input element, lot of types and options.
- **maintitlebar** - Replaces the native browser toolbar in Desktop PWAs.
- **masonry** - Masonry layout with CSS grid fallback
- **menubutton** - Buttons with options
- **number** - Displays formatted numbers
- **out** - Output variables (beta) *(beta)*
- **pagination** - Page number navigation with customizable URL patterns
- **parallax-bg** - Scroll-driven parallax background-layer with dynamic container sizing for full content visibility
- **qrcode** - QR-Code element
- **rating** - Rating element, form associated
- **responsive** - A Container, where you can define strategies, that are applied through CSS states. `<u2-responsive strategies="hideOptional">`
- **rte** - "Rich" Rich Text Editor (alpha)
- **skeleton** - Display a skeleton of the element. This is useful for showing the user where the element will be rendered before the actual content is loaded.
- **splitpanel** - A container that can be split horizontally or vertically. Parts are resizable by dragging the dividers.
- **spot** - Visual indicator tracking elements by selector
- **system** - Manage U2 system: preferences, debug, optimization
- **table** - Wrap Tables to make them enhanced tables (sortable, responsive...)
- **tabs** - Turns HTML structures with headings into an interactive, tabbed interface, using the content between headings as each tab’s content.
- **textfit** - Exactly fit text
- **time** - The better time-element, e.g. live changing relative dates
- **toc** - Automatically generate a Navigation by using the headings of the document.
- **tooltip** - Bind to target as child or via aria-labelledby
- **tree** - Treeview component `<u2-tree>Folder <u2-tree>File</u2-tree> </u2-tree>`
- **typewriter** - Simple typewriter element
- **video** - Video-element with controls and keyboard shortcuts.

**`css/`** - Global CSS utilities

- **base** - Best practices and useful defaults
- **classless** - Applies color vars and minimal styling to plain HTML — buttons, links, typography, background. No classes involved.
- **norm** - Browser normalization CSS – nothing else!
- **utils** - planned

**`js/`** - JavaScript ES modules

- **contextmenu** - context menus, simple and highly customisable
- **dialog** - alert, prompt, confirm but async
- **drag**
- **loading**
- **navigator**
- **Placer** - Positions elements relative to a target, auto-adjusting on move or resize.
- **PointerObserver** - Observe mouse and touches
- **rte** - Easily Make Elements Editable with Intuitive Controls
- **SelectorObserver** - Watches elements matching a selector
- **serviceWorker**
- **shortcut** - Easy keyboard shortcuts

**Naming:** `<u2-{name}>`, `.u2-{name}`, `[u2-{name}]`

**Module details:** Each module has its own README at `https://raw.githubusercontent.com/u2ui/u2/main/{category}/{name}/README.md` with usage examples, API docs, and demos.

## Installation

**Prototyping (auto-loads all):**
```html
<script type=module async src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/u2/auto.js"></script>
```

## CSS

auto.js also loads: css/base/base.css, css/classless/variables.css, css/classless/classless.css

Sets sensible defaults — do not re-implement these when base is loaded:

- `box-sizing: border-box` everywhere
- Fluid `font-size: calc(12.5px + .25vw)` on `html`
- `body { margin: auto; display: flow-root }` — child margins don't bleed out
- `interpolate-size: allow-keywords` — enables `height: auto` transitions
- `@view-transition { navigation: auto }` — free page transitions
- `hyphens: auto` with sensible limits
- `img/svg/video/canvas` → `max-inline-size: 100%; object-fit: cover; block-size: auto`
- `video/audio/iframe` → `inline-size: 100%`
- Tables: `border-collapse: collapse; font-variant-numeric: tabular-nums`
- `nav a { text-decoration: none }`, `nav li { list-style: none }`
- Form elements get `font: inherit`, unified padding, border
- `dialog/[popover]` fade in/out via `transition + @starting-style` — no JS needed
- `[inert], :disabled { opacity: .4 }`
- `.btn` — link styled as button, `display: inline-block`, no underline


The only thing you normally set: `--color`

```css
html {
    --color: #207acc; /* primary color — everything else derives from this */
}
```

All other color tokens are **automatically computed** via `color-mix()` and `oklch()` from `--color`:

```css
/* tints / shades — auto-derived, override only if needed */
--color-lightest  /* color-mix(--color, #fff 97%) */
--color-lighter   /* color-mix(--color, #fff 85%) */
--color-light     /* color-mix(--color, #fff 50%) */
--color-dark      /* color-mix(--color, #000 30%) */
--color-darker    /* color-mix(--color, #000 60%) */
--color-darkest   /* color-mix(--color, #000 87%) */

/* semantic — auto light/dark mode */
--color-bg        /* light: --color-lightest  /  dark: --color-darkest  */
--color-text      /* light: --color-darkest   /  dark: --color-lightest */
--color-area      /* light: --color-lighter   /  dark: --color-darker   */
--color-line      /* = --color-text */

/* gray — derived from --color hue, desaturated */
--gray, --gray-lighter, --gray-light, --gray-dark, --gray-darker

/* full palette — hue-rotated from --color's lightness/chroma */
--red, --orange, --yellow, --lime, --green, --cyan, --blue, --purple, --pink
```

`--accent` defaults to `--color` but can be set independently for e.g. focus rings.
