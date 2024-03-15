# code.el
highlighted, editable code-blocks.


## Attributes

`trim`: This will trim empty first and last lines, and most importantly, indentation.  
`editable`: This will make the code editable.  
`language`: Define the code-language (auto-detect if not set)

## Usage

```html
<link rel=stylesheet href="../../../code.el@x/code.css">
<scrip src="../../../code.el@x/code.js" type=module></script>

<u1-code trim>
    <pre>
        <code>
            html {
                background:red;
            }
        </code>
    </pre>
</u1-code>

pre and code blocks are optional, but recommended. to have a usefull fallback if javascript is disabled.

OR:

<u1-code trim>
    <textarea>
            html {
                background:red;
            }
    </textarea>
</u1-code>

or even:

<u1-code editable trim>
    <style>
            html {
                background:red;
            }
    </style>
</u1-code>


```


## Demos
https://raw.githack.com/u1ui/code.el/main/tests/minimal.html  
https://raw.githack.com/u1ui/code.el/main/tests/test.html  

