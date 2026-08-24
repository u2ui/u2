// scoped registries: concept worked out in ./plan-scoped-refactoring.md

const myUrl = new URL(import.meta.url);
let debug = myUrl.searchParams.get('debug') != null;
const root = new URL(myUrl.origin + myUrl.pathname + '/../../'); //console.log('%cuncomment localhost!','color:red;font-size:1.2em');
let rootUrl = root.toString();

if (root.host === 'localhost') debug = true;

if (debug) { // top level await safari >= 15.1
    await Promise.all([
        //import('https://cdn.jsdelivr.net/gh/nuxodin/lazyfill/mod.js'),
        //import('https://cdn.jsdelivr.net/gh/nuxodin/lazyfill/htmlfills.js'),
        //import('https://cdn.jsdelivr.net/gh/nuxodin/cleanup.js/mod.js'),
    ]);
}

import {importCss} from './utils.js';
import {enhance} from './enhance.js';

let prio = 1;
setTimeout(()=>prio = 2);
setTimeout(()=>prio = 3, 2000);
const needed = { js:{}, css:{} };
function impCss(url, options={}){
    if (!url || url in needed.css) return;
    importCss(url, options).then(res=>{
        if (res.available) needed.css[url]=0; // already loaded
    }).catch(() => needed.css[url]=0 ); // failed
    needed.css[url] = prio
}

window.u2 ??= Object.create(null);
window.u2.needed = needed;

////////////////////////////////////////////////////////////////
//
//  Import defaults
//
////////////////////////////////////////////////////////////////

impCss(rootUrl+'css/norm/norm.css');
impCss(rootUrl+'css/base/base.css');
setTimeout(()=>{
    impCss(rootUrl+'css/base/print.css', {media:'print'});
    impCss(rootUrl+'css/base/nomotion.css', {media:'prefers-reduced-motion'});
})
impCss(rootUrl+'css/classless/variables.css');
impCss(rootUrl+'css/classless/classless.css');
impCss(rootUrl+'css/classless/more.css');


////////////////////////////////////////////////////////////////
//
//  Autoimport
//
////////////////////////////////////////////////////////////////


/** enhance() does the scanning and loading; this file only records it for the ui. */
export function addShadowRoot(rootNode){
    return enhance(rootNode, { onLoad: (kind, url) => needed[kind][url] ??= prio });
}
addShadowRoot(document.documentElement)

////////////////////////////////////////////////////////////////
//
//  UI
//
////////////////////////////////////////////////////////////////

addEventListener('keydown',e=>{
    if (e.ctrlKey && e.key ==='F12') {
        import('./auto.ui.js').then(ui=>ui.open())
    }
});

////////////////////////////////////////////////////////////////
//
//  save used files
//
////////////////////////////////////////////////////////////////

/* save all */
function mergeNewlyNeeded(){
    let allNeeded = localStorage.getItem('u2-needed');
    allNeeded = JSON.parse(allNeeded) || {};
    Object.assign(allNeeded.js ||= {}, needed.js);
    Object.assign(allNeeded.css ||= {}, needed.css);
    //Object.assign(allNeeded, needed);
    localStorage.setItem('u2-needed', JSON.stringify(allNeeded));
}

document.addEventListener('DOMContentLoaded',mergeNewlyNeeded);
addEventListener('pagehide',mergeNewlyNeeded);


////////////////////////////////////////////////////////////////
//
//  ready
//
////////////////////////////////////////////////////////////////

console.log('%c%s','color:#2c8898;', '💡 press ctrl+F12 to configure the U2-design-system!');
