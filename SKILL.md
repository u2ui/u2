# u2 Framework

Modular web component framework. Lightweight, CDN-first, each module works standalone.

## Categories

**`attr/`** - Add behavior via HTML attributes

- **behavior** - behavior before action
- **confirm** - Shows a confirmation dialog on clicks or before form submits and only proceeds if confirmed.
- **disableif** - Disable form-elements (like inputs, buttons, fieldsets) based on a condition
- **draghandle** - Defines a handle element to drag a draggable item.
- **dropzone** - Dropzone for draggable elements. <div u2-dropzone=":scope selektor">
- **focusgroup** - Enables arrow-key navigation between focusable elements in a container.
- **href** - Makes any element act as a link. `u2-href="url"`
- **intersect** - declarativ intersection-observer
- **lightbox** - Link an image to a lightbox. `<a u2-lightbox=group1 src="image.jpg">`
- **movable** - Make an element movable. Optionally define a [u2-movable-handler] element.
- **navigable** - Enables dialogs, details, etc. to open via links with back history support.
- **parallax** - Makes elements scroll at different speeds for a parallax effect.
- **scrollspy** - Make a navigation that changes the `active` class based on the scroll position.
- **selectable** - Makes a container with selectable items. <div u2-selectable=".selector">
- **skin** - Change the skin of a widget
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
- **copy** - Mirrors an element’s content. `<u2-copy for="id" sync></u2-copy>`
- **counter** - Animated Number Counter
- **drawer**
- **fields** - Every content before a form element is considered as label
- **ico** - Universal icon-element
- **input** - Input element, lot of types and options.
- **maintitlebar** - Replaces the native browser toolbar in Desktop PWAs.
- **masonry** - Masonry layout with CSS grid fallback
- **menubutton** - Buttons with options
- **number** - Displays formatted numbers
- **out** - Output variables (beta) *(beta)*
- **pagination**
- **parallax-bg** - Scroll-driven parallax background-layer with dynamic container sizing for full content visibility
- **qrcode** - QR-Code element
- **rating** - Rating element, form associated
- **responsive** - A Container, where you can define strategies, that are applied through CSS states. `<u2-responsive strategies="hideOptional">`
- **rte** - "Rich" Rich Text Editor (alpha)
- **skeleton** - Display a skeleton of the element. This is useful for showing the user where the element will be rendered before the actual content is loaded.
- **splitpanel** - A splitpanel is a container that can be split horizontally or vertically. It is a simple container that can be used to split the screen into two or more parts.
- **spot**
- **system** - Manage U2 system: preferences, debug, optimization
- **table** - Wrap Tables to make them enhanced tables (sortable, responsive...)
- **tabs** - Turns HTML structures with headings into an interactive, tabbed interface, using the content between headings as each tab’s content.
- **textfit** - Exactly fit text
- **time** - The better time-element, e.g. live changing relative dates
- **toc** - Automatically generate a Navigation by using the headings of the document.
- **tooltip** - Bind to target as child or via aria-labelledby
- **tree1** - Treeview component `<u2-tree1>Folder <u2-tree1>File</u2-tree1> </u2-tree1>`
- **typewriter** - Simple typewriter element
- **video** - Video-element with controls and keyboard shortcuts.

**`css/`** - Global CSS utilities

- **base** - Best practices and useful defaults
- **classless** - null
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

## Installation

**Prototyping (auto-loads all):**
```html
<script type=module async src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/u2/auto.js"></script>
```

**Production (individual modules):**
```html
<!-- Custom Elements -->
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/{name}/{name}.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/{name}/{name}.js" type=module async></script>

<!-- CSS Classes -->
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/class/{name}/{name}.css" rel=stylesheet>

<!-- Attributes -->
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/attr/{name}/{name}.js" type=module async></script>

<!-- JS Modules -->
<script type=module>
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@main/js/{name}/{name}.js"
</script>
```

**Version pinning:** Replace `@main` with `@x.x.x` (e.g., `@1.2.3`) for production to lock to a specific version.

**Naming:** `<u2-{name}>`, `.u2-{name}`, `[u2-{name}]`

**Modules marked** *(beta)* or *(deprecated)* in descriptions.

**Module details:** Each module has its own README at `/{category}/{name}/README.md` with usage examples, API docs, and demos.

https://github.com/u2ui/u2
