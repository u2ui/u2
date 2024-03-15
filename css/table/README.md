# .u1-table - class
Better tables

## Features

- adds at the table definded paddings `--u1-Col-gap` `--u1-Col-gap` `--u1-Row-gap`
- makes non-table elements table-like
- Use modifier classes: 
    - Flex: To make table rows flex and break rows on smaller screens
    - NoSideGaps: to remove the left and right padding
    - Sticky: to make make header-cells sticky
    - Fields: to make inputs width 100%

## Usage

```html
<table class="u1-table -Flex -NoSideGaps -Sticky -Fields">
    <thead>
        <tr>
            <th>Name
            <th>Text Column
            <th>Last Colunn
    <tbody>
        <tr>
            <td>Cell 1 / 1
            <td>Cell 1 / 2
            <td>Cell 1 / 3
        <tr>
            <td>Cell 2 / 1
            <td>Cell 2 / 2
            <td>Cell 1 / 3 long content causing overflow-div to add scrollbars
        <tr>
            <td>Cell 3 / 1
            <td>Cell 3 / 2
            <td>Cell 1 / 3
        <tr>
            <td>Comment
            <td><textarea aria-label=textarea></textarea>
            <td><input aria-label=input>
</table>
```

```css
.u1-table {
    --u1-Gap:2rem;
    --u1-Col-gap:1rem;
}
```

## Install

```html
<link href="../../../table.class@x.x.x/table.min.css" rel=stylesheet>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/table.class@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/table.class@main/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

