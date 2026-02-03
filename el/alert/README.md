# &lt;u2-alert&gt; - element
Prominent hints, alerts and facts. `<u2-alert open variant=info>...</u2-alert>`

## Features

- Various variants for Success, Warn, Error, and Info alerts.
- Dismissable alerts allow user to close them.
- Support for icons within alerts.
- Customizable actions through buttons in the alert.

## Usage

```html
<u2-alert open variant="info" dismissable icon="bug_report">
    This is a dismissable alert with an custom icon.
    <button slot=action>Ok</button>
</u2-alert>
```

```css
u2-alert {
    border-width: 0 0 0 3px;
}
u2-alert::part(close) {
    opacity:0.3;
}
u2-alert::part(icon) {
    font-size:2em;
}
```

## API

### Attributes

- `variant`  
  Determines the alert type (`success`, `warn`, `error`, `info`); sets default icon and ARIA role.

- `dismissable`  
  Shows a close button. Without this attribute the close button is hidden.

- `icon`  
  Overrides the default icon from the variant. (use **Material Icon** names)

- `open`  
  Controls visibility.

- `duration`  
  Auto-close delay in toast mode (only when no `action` elements are present).


### Slots

- *(default)*  
  Main alert text.  

- `action`  
  Buttons or interactive elements.  
  If present → **no auto-close**, ARIA role becomes `alertdialog`.  

- `icon`  
  Provides a custom slotted icon.  

### CSS

--color: The color of the alert, if not set, it will be determined by the variant.
::part(close): The close button.
::part(icon): The icon.

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/alert/alert.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/alert/alert.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/alert/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/alert/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

