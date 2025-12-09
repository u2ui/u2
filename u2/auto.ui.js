import {render, html} from 'https://unpkg.com/uhtml@3.1.0/esm/index.js?module';
import {repos} from './u2.js';

let win = null;
export function open(){
    if (window['u2-config'] && !window['u2-config'].closed) window['u2-config'].close();

    win = window.open('about:blank', 'u2-config', 'popup,width=800,height=640');
    win.focus()
    const doc = win.document;

    // Problem: depencencies in this script are also tracked...
    doc.write (
        `<!DOCTYPE html>
        <html lang=en>
            <head>
                <meta charset=utf-8>
                <script>import('${import.meta.url+'/../auto.js'}')<\/script>
                <link rel="stylesheet" href="../../../el/ico/font/Material Icons.css">
                <style>
                    html {
                        font-size:14px;
                        padding:2rem;
                    }
                    body {
                        font-size:inherit;
                    }
                    pre {
                        font-size:12px;
                        xmax-height:70vh;
                    }
                </style>
            <body>`
    );

    setTimeout(()=>{
        renderUi(doc.body);
    }, 10);

}

async function renderUi(el){
    const code = await exportCode();
    render(el,
        html`
        <details>
            <summary>needed HTML</summary>
            <button onclick="${()=>win.navigator.clipboard.writeText(code)}">copy to clipboard</button>
            <button onclick="${()=>win.localStorage.removeItem('u2-needed')}">reset</button>
            <pre>${code}</pre>
        </details>
        `
    );
}

const needed = window.u2.needed;

const exportCode = async function(){
    await repos();

    let needed = localStorage.getItem('u2-needed');
    needed = JSON.parse(needed) || {};



    let strCss = Object.entries(needed.css).filter(([,prio])=>prio===1).map(([url,prio])=>'<link href="'+url+'" rel="stylesheet" crossorigin>').join('\n');

    // todo: combined string (just in the console for now)
    let strCssPromizes = Object.entries(needed.css).filter(([,prio])=>prio===1).map(([url,prio])=>{
        return fetch(url).then(res=>res.text());
    });
    const cssContents = await Promise.all(strCssPromizes);
    const cssText = cssContents.join('').replace(/\/\*[\s\S]*?\*\//g, '');
    console.log(cssText);


    let strJs  = Object.entries(needed.js).map(([url,prio])=>'<script src="'+url+'" type=module crossorigin async></script>').join('\n');
    let strCssNonCritical = Object.entries(needed.css).filter(([,prio])=>prio>1).map(([url,prio])=>'<link rel="stylesheet" href="'+url+'" crossorigin>').join('\n');
    return strCss +'\n' + strJs + '\n' + '\n<!-- non critical at the end -->\n' + strCssNonCritical;
}


