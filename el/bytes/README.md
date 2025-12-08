# &lt;u2-bytes&gt; - element
Displays formatted bytes

## Usage

```html
<u2-bytes>89887987</u2-bytes>
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/bytes/bytes.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/bytes/bytes.min.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/bytes/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/bytes/tests/minimal.html)  

## Attributes

Attribute        | Options                      | Default         | Description
---              | ---                          | ---             | ---
`lang`           | language                     | parent lang     | If not present navigator.language is used
`value`          | bytes                       |                 | The bytes to display
`digits`         | bytes                       |                 | The bytes of digits after the decimal point
`currency`       | string                       |                 | The currency of the bytes
`unit`           | string                       |                 | The unit of the bytes
`percent`        | boolean                      |                 | The bytes is a percentage

`currency`, `unit` and `percent` are mutually exclusive.

innerHTML is evaluated as value if value-attribute is not present, else its simply a fallback for when no javascript is available

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

