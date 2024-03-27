const myUrl = new URL(import.meta.url);
const debug = myUrl.searchParams.get('debug');



//const root = new URL('https://cdn.jsdelivr.net/gh/u2ui/');
const root = new URL(myUrl.origin + myUrl.pathname + '/../../'); //console.log('%cuncomment localhost!','color:red;font-size:1.2em');
let rootUrl = root.toString();

let min = '.min';
let useLatest = true;
if (root.host === 'localhost') {
    min = '';
    useLatest = false;
}

// get faster cdn updates? https://purge.jsdelivr.net/gh/nuxodin/cleanup.js@latest/

if (debug) { // top level await safari >= 15.1
    min = '';
    await Promise.all([
        import('https://cdn.jsdelivr.net/gh/nuxodin/lazyfill/mod.min.js'),
        import('https://cdn.jsdelivr.net/gh/nuxodin/lazyfill/htmlfills.min.js'),
        import('https://cdn.jsdelivr.net/gh/nuxodin/cleanup.js/mod.min.js'),
    ]);
}

import {importCss} from './utils.js';
import {latestUrlCached, repos} from './u2.js';

await repos();

let prio = 1;
setTimeout(()=>prio = 2);
setTimeout(()=>prio = 3, 2000);
const needed = { js:{}, css:{} };
function impJs(url){
    if (useLatest) url = latestUrlCached(url);
    if (!url || url in needed.js) return;
    needed.js[url] = prio;
    return import(url);
}
function impCss(url, options={}){
    if (useLatest) url = latestUrlCached(url)
    if (!url || url in needed.css) return;
    importCss(url, options).then(res=>{
        if (res.available) needed.css[url]=0; // already loaded
    }).catch(() => needed.css[url]=0 ); // failed
    needed.css[url] = prio
}

window.u2 = Object.create(null);
window.u2.needed = needed;

////////////////////////////////////////////////////////////////
//
//  Import defaults
//
////////////////////////////////////////////////////////////////

impCss(rootUrl+'css/norm/norm'+min+'.css');
//impCss(rootUrl+'norm.css/beta'+min+'.css');
impCss(rootUrl+'css/base/base'+min+'.css');
//impCss(rootUrl+'base.css/beta'+min+'.css');
setTimeout(()=>{
    impCss(rootUrl+'css/base/print.css', {media:'print'});
    impCss(rootUrl+'css/base/nomotion.css', {media:'prefers-reduced-motion'});
})
impCss(rootUrl+'css/classless/variables'+min+'.css');
impCss(rootUrl+'css/classless/classless'+min+'.css');
impCss(rootUrl+'css/classless/more'+min+'.css');
//impCss(rootUrl+'css/classless/aria'+min+'.css');
//impCss(rootUrl+'css/classless/simple'+min+'.css');


////////////////////////////////////////////////////////////////
//
//  Autoimport
//
////////////////////////////////////////////////////////////////


function newNode(node){
    if (node.tagName.startsWith('U2-')) {
        let name = node.tagName.substring(3).toLowerCase();
        if (customElements.get('u2-'+name)) return; // skip if registred
        const base = rootUrl + 'el/' + name + '/' + name + min;
        impCss(base + '.css'/*, {for:node}*/);
        impJs(base + '.js');
    }
    let classList = node.classList;
    for (let i=0, l=classList.length; i<l; i++) {
        let klass = classList[i]
        if (!klass.startsWith('u2-')) continue;
        let name = klass.substring(3);
        impCss(rootUrl + 'class/' + name + '/' + name + min + '.css');
    }
    const attris = node.attributes;
    for (let i=0, l=attris.length; i<l; i++) {
        let attr = attris[i]
        if (!attr.name.startsWith('u2-')) continue;
        let name = attr.name.substring(3).replace(/-.*/,''); // example: u2-href-target => href
        // todo: how to check if already added manually?
        impJs(rootUrl + 'attr/' + name + '/' + name + min + '.js');
    }
}
function newNodeRoot(node){
    if (!node.tagName) return;
    newNode(node);
    node.querySelectorAll('*').forEach(newNode);
}
var mo = new MutationObserver((entries)=>{
    for (let i=0, l=entries.length; i<l; i++) {
        let nodes = entries[i].addedNodes;
        for (let j=0, l2=nodes.length; j<l2; j++) {
            newNodeRoot(nodes[j]);
        }
    }
});

export function addShadowRoot(rootNode){
    mo.observe(rootNode,{childList:true, subtree:true, characterData:false});
    newNodeRoot(rootNode);
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
    allNeeded.js = Object.assign(allNeeded.js||{}, needed.js);
    allNeeded.css = Object.assign(allNeeded.css||{}, needed.css);
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

console.log('%c%s','color:#2c8898;xfont-size:1.3em', '💡 press ctrl+F12 to configure the U2-design-system!');
