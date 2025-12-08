# &lt;u2-ico&gt; - element
Universal icon-element

## Features

- Use any icon set you want
- You can put direct SVG inside the element
- You can use a icon-font
- Or you define a directory, where the svg-files are located

## Usage

```html
<u2-ico aria-label="alien">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,16a96.11,96.11,0,0,0-96,96c0,24,12.56,55.06,33.61,83,21.18,28.15,44.5,45,62.39,45s41.21-16.81,62.39-45c21.05-28,33.61-59,33.61-83A96.11,96.11,0,0,0,128,16Zm49.61,169.42C160.24,208.49,140.31,224,128,224s-32.24-15.51-49.61-38.58C59.65,160.5,48,132.37,48,112a80,80,0,0,1,160,0C208,132.37,196.35,160.5,177.61,185.42ZM120,136A40,40,0,0,0,80,96a16,16,0,0,0-16,16,40,40,0,0,0,40,40A16,16,0,0,0,120,136ZM80,112a24,24,0,0,1,24,24h0A24,24,0,0,1,80,112Zm96-16a40,40,0,0,0-40,40,16,16,0,0,0,16,16,40,40,0,0,0,40-40A16,16,0,0,0,176,96Zm-24,40a24,24,0,0,1,24-24A24,24,0,0,1,152,136Zm0,48a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,184Z"></path></svg>
</u2-ico>


```

```css
@font-face {
    font-family: 'RemixFilled';
    font-style: normal;
    font-weight: 400;
    src: url(https://cdn.jsdelivr.net/npm/remixicon-ligatures@2.5.0/fonts/RemixFilled.woff2) format('woff2');
}

[icon="book"] {
    --u2-ico-dir: 'https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2.0.2/assets/regular/';
    color:blue;
}
[icon="star"] {
    --u2-ico-font: 'RemixFilled';
    color:green;
}
u2-ico:has(>svg) {
    color:red;
}
u2-ico {
    --size:3rem;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/ico/ico.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/ico/ico.min.js" type=module async></script>
```

## Demos

[ico-directory.html](http://gcdn.li/u2ui/u2@main/el/ico/tests/ico-directory.html)  
[combinations.html](http://gcdn.li/u2ui/u2@main/el/ico/tests/combinations.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/ico/tests/test.html)  
[emojis.html](http://gcdn.li/u2ui/u2@main/el/ico/tests/emojis.html)  
[fonts.html](http://gcdn.li/u2ui/u2@main/el/ico/tests/fonts.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/ico/tests/minimal.html)  
[sprite.html](http://gcdn.li/u2ui/u2@main/el/ico/tests/sprite.html)  

## Variant "icon-directory"

Use the css-property `--u2-ico-dir:https://x.y/icons-directory/` to define where the icons are located.  
The value must be in quotes.  

### Placeholder "{icon}"

If the icon is not located at the end of the path (https://x.y/star.svg), you can use this placeholder:  
```css
html {
    --u2-ico-dir:'https://x.y/24x-{icon}/baseline.svg';
}
```

### Icon-naming
We prefer to alwas use lowercase names for the icons and use the `-` as a separator. E.g. `arrow-right`.  
But if your prefered Icon-Set uses other naming conventions, you can use the placeholder `{icon-name}` in the same form as the Iconset's files are named:   
`{iconName}` => first word is lowercase, second word is uppercase and there is no separator.

```css
html {
    --u2-ico-dir:'https://cdn.jsdelivr.net/npm/@adobe/spectrum-css-workflow-icons@1.4.2/24/{IconName}';
}
```

### Some icon sets

See it in action:
[ico-directory.html](https://raw.githack.com/u2ui/ico.el/main/tests/ico-directory.html)

| Icon set   | Directory |
| --------   | --------- |
| Material                  | `https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.33/svg/{icon_name}/baseline.svg` |
| Teenyicons                | `https://cdn.jsdelivr.net/npm/teenyicons@0.4.1/outline/` |
| Feather                   | `https://cdn.jsdelivr.net/npm/feather-icons@4.28.0/dist/icons/` |
| Bootstrap                 | `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.5.0/icons/` |
| Octicons                  | `https://cdn.jsdelivr.net/npm/octicons@8.5.0/build/svg/` |
| Bytesize                  | `https://cdn.jsdelivr.net/npm/bytesize-icons@1.4.0/dist/icons/` |
| Ionicons                  | `https://cdn.jsdelivr.net/npm/ionicons@5.5.1/dist/svg/` |
| Tabler Icons              | `https://cdn.jsdelivr.net/npm/tabler-icons@1.35.0/icons/` |
| Fontawesome regular       | `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.3/svgs/regular/` |
| Fontawesome solid         | `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.3/svgs/solid/` |
| Fontawesome brands        | `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.3/svgs/brands/` |
| Dripicons                 | `https://cdn.jsdelivr.net/npm/dripicons@2.0.0/SVG/` |
| CoreUI Icons              | `https://cdn.jsdelivr.net/npm/@coreui/icons@2.0.1/svg/free/cil-` |
| open-iconic               | `https://cdn.jsdelivr.net/npm/open-iconic@1.1.1/svg/` |
| Radix                     | `https://cdn.jsdelivr.net/gh/radix-ui/icons@3.1.0/packages/radix-icons/icons/15/` |
| Heroicons outline         | `https://cdn.jsdelivr.net/npm/heroicons@1.0.1/outline/` |
| Heroicons solid           | `https://cdn.jsdelivr.net/npm/heroicons@1.0.1/solid/` |
| Typicons                  | `https://cdn.jsdelivr.net/npm/typicons.font@2.1.2/src/svg/` |
| Boxicons regular          | `https://cdn.jsdelivr.net/npm/boxicons@2.0.7/svg/regular/bx-` |
| Boxicons solid            | `https://cdn.jsdelivr.net/npm/boxicons@2.0.7/svg/solid/bxs-` |
| linearicons               | `https://cdn.jsdelivr.net/npm/linearicons@1.0.2/dist/svg/` |
| FluentUI regular          | `https://cdn.jsdelivr.net/npm/@svg-icons/fluentui-system-regular@1.56.0/` |
| FluentUI filled           | `https://cdn.jsdelivr.net/npm/@svg-icons/fluentui-system-filled@1.56.0/` |
| Evil Icons                | `https://cdn.jsdelivr.net/npm/evil-icons@1.10.1/assets/icons/ei-` |
| Eva Icons fill            | `https://cdn.jsdelivr.net/npm/eva-icons@1.1.3/fill/svg/` |
| Eva Icons outline         | `https://cdn.jsdelivr.net/npm/eva-icons@1.1.3/outline/svg/{icon}-outline.svg` |
| Zondicons                 | `https://cdn.jsdelivr.net/npm/zondicons@1.2.0/` |
| holasvg-icons             | `https://cdn.jsdelivr.net/gh/marianabeldi/holasvg-icons/icons/` |
| Jam icons                 | `https://cdn.jsdelivr.net/gh/michaelampr/jam@3.1.0/icons/` |
| entypo                    | `https://cdn.jsdelivr.net/npm/entypo@2.2.1/src/Entypo/` |
| Adobe Spectrum            | `https://cdn.jsdelivr.net/npm/@adobe/spectrum-css-workflow-icons@1.4.2/24/{IconName}.svg` |
| mono icons                | `https://cdn.jsdelivr.net/npm/mono-icons@1.3.1/svg/` |
| line awesome              | `https://cdn.jsdelivr.net/npm/line-awesome@1.3.0/svg/` |
| flat color icons          | `https://cdn.jsdelivr.net/npm/flat-color-icons@1.1.0/svg/` |
| icons8 windows-10-icons   | `https://cdn.jsdelivr.net/npm/windows-10-icons@1.0.1/svg/production/{icon_name}.svg` |
| fticons                   | `https://cdn.jsdelivr.net/npm/@financial-times/fticons@1.23.1/svg/` |
| photon icons              | `https://cdn.jsdelivr.net/npm/photon-icons@5.4.0/icons/desktop/` |
| devicons                  | `https://cdn.jsdelivr.net/npm/devicons@1.8.0/!SVG/{icon_name}` |
| Figma UI Icons            | `https://cdn.jsdelivr.net/npm/css.gg@2.0.0/icons/svg/` |
| ifolio licons             | `https://cdn.jsdelivr.net/gh/ifolio/licons@master/svg/` |

## Variant "icon-font":

Define the font used for the icons:
```css
@font-face {
    font-family: 'my icon font';
    font-style: normal;
    font-weight: 400;
    src: url(my-icon-font.woff2) format('woff2');
}
html {
    --u2-ico-font:'my icon font';
}
```

Note: `--u2-ico-dir` is stronger then `--u2-ico-font`.

## Variant "SVG":

Just put you svg inside the element:
```html
<u2-ico><svg>...</svg></u2-ico>
```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

