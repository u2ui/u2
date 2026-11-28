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
                <link rel="stylesheet" href="${new URL('../el/ico/font/Material Icons.css', import.meta.url)}">
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

const exportCode = async function(){
    await repos();

    const needed = JSON.parse(localStorage.getItem('u2-needed')) || {};

    const css = Object.entries(needed.css || {});
    const crit = css.filter(([,p]) => p === 1);
    const strCss = crit.map(([url]) => `<link href="${url}" rel="stylesheet" crossorigin>`).join('\n');

    // todo: combined string (just in the console for now)
    const cssContents = await Promise.all(crit.map(([url]) => fetch(url).then(res => res.text())));
    const cssText = cssContents.join('').replace(/\/\*[\s\S]*?\*\//g, '');
    console.log(cssText);


    const strJs = Object.entries(needed.js || {}).map(([url]) => `<script src="${url}" type=module crossorigin async></script>`).join('\n');
    const strCssNonCritical = css.filter(([,p]) => p > 1).map(([url]) => `<link rel="stylesheet" href="${url}" crossorigin>`).join('\n');
    return strCss +'\n' + strJs + '\n' + '\n<!-- non critical at the end -->\n' + strCssNonCritical;
}


