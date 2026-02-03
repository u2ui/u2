# .u2-table - class
Better tables

## Features

- adds at the table defined paddings `--u2-Col-gap` `--u2-Col-gap` `--u2-Row-gap`
- makes non-table elements table-like
- Use modifier classes: 
    - Flex: To make table rows flex and break rows on smaller screens
    - NoSideGaps: to remove the left and right padding
    - Sticky: to make make header-cells sticky
    - Fields: to make inputs width 100%

## Usage

```html
<table class="u2-table x-Flex -NoSideGaps -Sticky x-Fields">
    <thead>
        <tr>
            <th>Table
            <th>Column
            <th>Column
    <tbody>
        <tr>
            <td>Cell 1/1
            <td>Cell 1/2
            <td>Cell 1/3
        <tr>
            <td>Cell 2/1
            <td>Cell 2/2
            <td>Cell 1/3
</table>
```

```css
.u2-table {
    --u2-Gap:2rem;
    --u2-Col-gap:1rem;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/class/table/table.css" rel=stylesheet>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/class/table/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/class/table/tests/minimal.html)  
[fields.experiments.html](http://gcdn.li/u2ui/u2@main/class/table/tests/fields.experiments.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

