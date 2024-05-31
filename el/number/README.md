# &lt;u2-number&gt; - element
Displays formatted numbers

## Usage

```html
Number:
<u2-number value="8987.2345" digits="2">
    8'987.23
</u2-number>
```

```css
u2-number {
    font-size: 2em;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/number/number.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/number/number.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/number/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/number/tests/test.html)  

## Attributes

Attribute        | Options                      | Default         | Description
---              | ---                          | ---             | ---
`lang`           | language                     | parent lang     | If not present navigator.language is used
`value`          | number                       |                 | The number to display
`digits`         | number                       |                 | The number of digits after the decimal point
`currency`       | string                       |                 | The currency of the number
`unit`           | string                       |                 | The unit of the number
`percent`        | boolean                      |                 | The number is a percentage

`currency`, `unit` and `percent` are mutually exclusive.

innerHTML is evaluated as value if value-attribute is not present, else its simply a fallback for when no javascript is available

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

