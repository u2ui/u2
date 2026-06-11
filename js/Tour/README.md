# Tour.js
Simple guided tours for existing interfaces.
Targets are highlighted without modifying them.
The mask is isolated, while the info and buttons inherit the website's styles.

Style `.u2TourInfo`, `.u2TourContent`, `.u2TourButtons`, `.u2TourBack`,
`.u2TourNext` and `.u2TourClose` as part of the website.

## Usage

```js
import { Tour } from '../Tour.js';

const tour = new Tour([
    {target:'#title', content:'This is the title.'},
    {target:'#text', content:'And this is the description.'},
]);

start.onclick = () => tour.start();
```

```html
<button id=start>Start tour</button>
<h1 id=title>Simple Tour</h1>
<p id=text>A tour highlights existing elements.</p>
```

## API

```js
tour.start();
tour.show(1);
tour.next();
tour.back();
tour.stop();

tour.addEventListener('step', e => console.log(e.detail));
tour.addEventListener('complete', () => console.log('completed'));
tour.addEventListener('close', () => console.log('closed'));
```

The tour buttons support horizontal arrow-key navigation using
[`u2-focusgroup`](../../attr/focusgroup/README.md).

The info uses a non-modal dialog role, announces changed steps, closes with
Escape and restores focus to the element active before the tour.

## Install

```js
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@main/js/Tour/Tour.js"
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/js/Tour/tests/minimal.html)  
[demo.html](http://gcdn.li/u2ui/u2@main/js/Tour/tests/demo.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

