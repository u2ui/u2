# &lt;u2-cookiebanner&gt; - element
Cookie banner for consent management.

## Features

- Lightweight!
- Easy to use!
- Known cookie cleanup
- Responsive design
- 23 Languages (request for more)
- Customizable messages
- Customizable policy link
- Google Consent Mode v2 integration
- Minimal Styled, easy to customize (no Shadow DOM)

## Usage

```html
<u2-cookiebanner message="We have no cookies, just a test"></u2-cookiebanner>
<button onclick="u2Cookiebanner.show()">Change Consent</button>
```

```css
u2-cookiebanner {
  box-shadow:0 0 1rem #0006;
  inset:0;
  max-width:13rem;
  &::backdrop {
    background-color: #0006;
  }
}
```

## API

Attributes (all optional):
- `message`: The message to be displayed.
- `policy-link`: The link to the privacy policy.
- `categories`: Space separated list of categories to be displayed. Default: `necessary functional analytics marketing`
- `lang`: Language of the banner. `lang` can be set on a parent element too.

Methods:
- `show()` - show the banner, even if cookie is already set

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/cookiebanner/cookiebanner.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/cookiebanner/cookiebanner.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/cookiebanner/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/cookiebanner/tests/test.html)  

## Extensions

- [googleConsentMode.js](./extensions/googleConsentMode.js) - Google Consent Mode v2 integration

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

