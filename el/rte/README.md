# &lt;u2-rte&gt; - element

Progressively enhances one native textarea with the RTE2 rich-text editor.
The textarea remains the form control, fallback, and canonical serialized value.

## Usage

```html
<u2-rte>
    <textarea name="content"><p>Some <strong>HTML</strong></p></textarea>
</u2-rte>
```

HTML is the default language. Markdown loads its converters only when used:

```html
<u2-rte language="markdown">
    <textarea name="content">Some **Markdown**</textarea>
</u2-rte>
```

Exactly one direct `textarea` is required. Free child content is deliberately
not supported. Put form attributes such as `name`, `required`, `disabled`,
`readonly`, `placeholder`, and `form` on the textarea.

The `value` property reads and writes the serialized textarea value. Editor
changes update it before a bubbling `input` event is emitted from the textarea.
A bubbling `change` event follows when focus leaves an editor changed since its
last change event. Form reset, disabled, readonly, placeholder, direction,
language, and spellchecking state are mirrored back to the editor.

## Languages

- `html` (default) stores sanitized HTML.
- `markdown` parses with Marked and serializes with Turndown. The dependencies
  are loaded lazily from jsDelivr.

Other formats need a proven round-trip between their source text and the HTML
DOM edited by RTE2. They should not be added as aliases or partial parsers.

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/rte/rte.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/rte/rte.js" type=module async></script>
```

## TODO

- Add `el/rte` to U2's generated project catalog when the module is ready for
  automatic loading. It currently requires the explicit module import shown
  above because that catalog lives outside this module.
- RTE2 needs a shared root-aware convention-client entry point before this
  adapter can support editors placed inside an application ShadowRoot. The
  current public convenience client owns the document root only.
- RTE2 should report whether a committed change already has a corresponding
  native `input` event. The adapter currently uses the transaction trigger to
  avoid emitting duplicate input events.
- Complete label, constraint-validation, selection, and focus tests for the
  visually hidden textarea across current Chromium, Firefox, and WebKit.
- Allow applications to provide language codecs without turning the initial
  two built-in formats into a general plugin system prematurely.

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/rte/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/rte/tests/minimal.html)

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥
