# &lt;u2-cookiebanner&gt; - element
Cookie banner for consent management.

## Features

- Google Consent Mode v2 integration
- Known cookie cleanup
- Responsive design
- Translations
- Customizable messages
- Customizable policy link
- Customizable buttons
- Customizable backdrop
- Customizable skin
- Customizable language

## Usage

```html
<u2-cookiebanner message="We have no cookies, just a test"></u2-cookiebanner>
<button onclick="u2Cookiebanner.show()">Change Consent</button>
```

## API

Attributes (all optional):
- `message`: The message to be displayed.
- `policy-link`: The link to the privacy policy.
- `categories`: Space separated list of categories to be displayed. Default: `necessary functional analytics marketing`
- `lang`: Language of the banner. `lang` can be set on a parent element too.

CSS:
- `u2-cookiebanner` - the main element
- `u2-cookiebanner .-main` - the main content
- `u2-cookiebanner .-settings` - the settings content
- `u2-cookiebanner .-categories` - the categories list
- `u2-cookiebanner .-buttons` - the buttons container
- `u2-cookiebanner::backdrop` - the backdrop

Events:
- `u2-cookiebanner-consent` - emitted initially and when consent is changed
example:
```js
document.addEventListener('u2-cookiebanner-consent', ({detail: {consent, isUpdate}}) => {
    if (consent.analytics) {
        loadAnalytics();
    }
});
```

Methods:
- `show()` - show the banner, even if cookie is already set

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/cookiebanner/cookiebanner.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/cookiebanner/cookiebanner.min.js" type=module async></script>
```

## Demos

[index.html](http://gcdn.li/u2ui/u2@main/el/cookiebanner/tests/index.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/cookiebanner/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

