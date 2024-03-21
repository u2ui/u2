
import {dump, encode} from 'https://cdn.jsdelivr.net/gh/nuxodin/dump.js@1.2.2/mod.min.js';

function customRender(obj){
    let isElement = false;
    try {
        isElement = obj instanceof Element && obj.tagName;
    } catch {}
    if (isElement) {
        return encode(obj.outerHTML.substring(0, 50))+"...";
    }
}
function alertInit(el) { el.classList.add('backdropClose'); }

import {alert} from '../../js/dialog/dialog.js';

export class EventsExplorer {
    constructor(into, el, events) {
        this.into = into;
        this.el = el;
        this.events = events;
        this.into.innerHTML =
            `<div style="display:flex; justify-content:end"><button class=-clearbtn>clear</button></div>
            <div class=-listWrapper style="overflow:auto;max-height:18rem">
                <table style="border-collapse:collapse">
                    <thead>
                        <tr>
                            <th>Event
                            <th>Target
                            <th>Phase
                    <tbody>
                </table>
            </div>`;
        this.tbody = this.into.querySelector('tbody');

        this.into.querySelector('.-clearbtn').addEventListener('click', () => this.clear() );
    }
    clear(){
        this.tbody.innerHTML = '';
    }
    scrollToEnd() {
        const div = this.into.querySelector('.-listWrapper');
        div.scrollTop = div.scrollHeight;
//        this.into.querySelector('div').scrollTo({
    }
    start() {
        this.clear();
        let grow = 1;
        let activeTr = null;
        setInterval(() => {
            if (!activeTr || grow > 10) return;
            grow = Math.max(1, grow);
            activeTr.style.borderBottomWidth = (grow+=0.01)+'px';
            this.scrollToEnd();
        },10);
        let renderEvent = (event)=>{
            let tr = document.createElement('tr');
            activeTr = tr;
            grow = 0;
            tr.style.borderBottom = '0px solid black';
            const tag = event.target.tagName?.toLowerCase() ?? (event.target.nodeType === 3 ? '[text]' : '[unknown]');
            const klass = event.target.className?.trim().replace(/\s+/g, '.').replace(/^(.)/, '.$1') || null;
            const id = event.target.id ? '#'+event.target.id : null;

            const typeDot = `<span style="color:${stringToColor(event.type)}">⬤</span>`;
            const targetDot = `<span style="color:${stringToColor(tag+id+klass)}">⬤</span>`;

            tr.innerHTML = 
                `<td>${typeDot} ${event.type}
                 <td>${targetDot} ${id??klass??tag}
                 <td>${event.eventPhase}<td class=-dump><button style="font-size:12px; margin:0">inspect</button>`;
            tr.querySelector('.-dump').addEventListener('click', () => {
                alert({body:dump(event, {depth:2, customRender}), init:alertInit});
                dump(event, {depth:2})
            });

            this.tbody.append(tr);
            this.scrollToEnd();
        }
        for (const ev of this.events) {
            //this.el.addEventListener(ev, renderEvent, false);
            this.el.addEventListener(ev, renderEvent, true);
        }
    }
}

function fnv1aHash(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash = (hash ^ str.charCodeAt(i)) * 16777619;
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
}

function stringToColor(str) {
    let hash = fnv1aHash(str);

    let h = (hash >> 16) & 0xFF; // Extrahiere die höchsten 8 Bits für Hue
    let s = (hash >> 8) & 0xFF; // Extrahiere die mittleren 8 Bits für Saturation
    let l = hash & 0xFF; // Extrahiere die niedrigsten 8 Bits für Lightness

    // Normalisiere die Werte in ihre jeweiligen Bereiche
    h = (h % 360); // Hue zwischen 0 und 359
    // Sättigung zwischen 60% und 100%
    s = 60 + (s % 41);
    // Helligkeit zwischen 30% und 50%, um extreme Dunkelheit/Helligkeit zu vermeiden
    l = 30 + (l % 21);

    return `hsl(${h}, ${s}%, ${l}%)`;
}
