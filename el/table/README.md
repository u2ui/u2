# &lt;u2-table&gt; - element
Wrap Tables to make them enhanced tables (sortable, responsive...)

## Features

- Behavior that you can't cover without css.
- Responsive (breaks of overflows)
- Sets the header-cell text as aria-label on each cell
- Use attribute `data-sortby` to customize the sort order

## Usage

```html
<u2-table>
    <table>
        <colgroup>
            <col>
            <col>
            <col class="age-col"/>
        <thead>
            <tr>
                <th data-sort-handler> Firstname         
                <th data-sort-handler> Lastname
                <th data-sort-handler> Age
        <tbody>
            <tr><td> Wolfgang Amadeus  <td> Mozart      <td> 46
            <tr><td> Hans              <td> Muster      <td> 1
            <tr><td> Fridrich          <td> Langenegger <td> 5
    </table>
</u2-table>
```

```css
u2-table {
    white-space:nowrap;
}
.age-col {
    text-align:right;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/table/table.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/table/table.min.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/table/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/table/tests/minimal.html)  
[multiselect.html](http://gcdn.li/u2ui/u2@main/el/table/tests/multiselect.html)  
[drag.html](http://gcdn.li/u2ui/u2@main/el/table/tests/drag.html)  
[autoformat.html](http://gcdn.li/u2ui/u2@main/el/table/tests/autoformat.html)  
[columns.api.html](http://gcdn.li/u2ui/u2@main/el/table/tests/columns.api.html)  

## Todo

Make strategies for responsive tables like the following:
```html
<u2-table overflow-strategy="break hide-optional vertical-headers">
```
If it overflows, the script walks through the strategies in the defined order.
And sets the state attribute `<u2-table :overflows="strategy1 strategy2 ...">`

In the css there are some predefined or custom rules for the overflow-strategy.
```css
u2-table[\:overflows~=hide-optional] :is(td,th).optional {
    display:none;
}
```
If the table still overflows, the next strategy comes into play.

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

