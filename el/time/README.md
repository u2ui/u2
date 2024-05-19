# &lt;u2-time&gt; - element
The better time-element, e.g. live changing relative dates

## Features

- live changing relative dates 
- generates a title attribute with the absolute date

## Usage

```html
<u2-time datetime="2013-04-01T18:02" type=relative lang=de>1. April 2013 18:02</u2-time>.
```

```css
u2-time {
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/time/time.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/time/time.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/time/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/time/tests/test.html)  

## Attributes

Attribute        | Options                      | Default         | Description
---              | ---                          | ---             | ---
`datetime`       | ISO 8601 date                | required        | e.g. `2011-10-10T14:48:00`
`lang`           | language                     | parent lang     | If not present navigator.language is used
`type`           | date, relative               | relative        | The way the date should be displayed


### If type=date

Attribute        | Options                                      | Default       | Description
---              | ---                                          | ---           | ---
`weekday`        | narrow, short, long, none                    | short         | Format weekday as `Sun` or `Sunday`
`year`           | numeric, 2-digit, none                       | numeric       | Format year as `14` or `2014`
`month`          | numeric, 2-digit, narrow, short, long, none  | numeric       | Format month as `Jun` or `June`
`day`            | numeric, 2-digit, none                       | numeric       | Format day as `01` or `1`
`hour`           | numeric, 2-digit, none                       | none          | Format hour as `01` or `1`
`minute`         | numeric, 2-digit, none                       | none          | Format minute as `05` or `5`
`second`         | numeric, 2-digit, none                       | none          | Format second as `05` or `5`

### If type=relative

Attribute        | Options                                      | Default       | Description
---              | ---                                          | ---           | ---
`mode`           | narrow, short, long                          | short         | `28 minutes ago` , `29 min. ago`

## Todo

- recognise the resolution of the given date (has time or not)
- optional provide date as innerHTML

## Similar projects

https://github.com/github/relative-time-element

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

