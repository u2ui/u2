import {$range} from '../../range.js';
import * as state from '../../events.js';


let wrapper = document.createElement('div');
wrapper.id = 'qgRteHtml';
wrapper.innerHTML = 
    '<u2-code class=-editor editable trim></u2-code>'+
    //'<textarea class=-editor spellcheck=false class=c1Rst></textarea>'+
    '<style>'+
    '	#qgRteHtml { opacity:1; transform:opacity .5s; position:fixed; border:2px solid black; top:40%; left:1%; bottom:1%; right:1%; background:#fff; color:#000; margin:auto; box-shadow:0 0 20px} '+
    '	#qgRteHtml > .-editor { position:absolute; inset:0; width:100%; height:100%; font:11px monospace; padding:1vw; } '+
    '	#qgRteHtml.-Invisible { opacity:.1; } '+
    '	#qgRteHtml:hover { opacity:1; } '+
    '</style>';

const html = wrapper.firstChild;

Rte.ui.setItem('Code', {
    icon: 'code',
    click() {
        const el = state.active;
        const range = $range(state.range);
        const startTextNode = document.createTextNode('marker_start_so9df8as0f0');
        const endTextNode   = document.createTextNode('marker_end_laseg08a0egga');
        
        range.cloneRange().collapse(false).insertNode(endTextNode);
        range.cloneRange().collapse(true).insertNode(startTextNode);

        //code = domCodeIndent(el.innerHTML);
        let code = el.innerHTML;

        startTextNode.remove();
        endTextNode.remove();

        const start = code.indexOf('marker_start_so9df8as0f0');
        code = code.replace('marker_start_so9df8as0f0','');
        const end = code.indexOf('marker_end_laseg08a0egga');
        code = code.replace('marker_end_laseg08a0egga','');

        const brsTotal = (code.match(/\n/g)||[]).length;
        const brs = brsTotal && (code.substr(0,start).match(/\n/g)||[]).length;

        document.body.append(wrapper);

        setTimeout(()=>{
            //html.focus(); // if direct textarea
            html.textarea.focus();
            let y = parseInt((html.scrollHeight / brsTotal)*brs - 250);
            brs && (html.scrollTop = y);
            html.setSelectionRange(start, end);
        },10);

        import('../../../../el/code/code.js').then(({Code})=>{
        //customElements.whenDefined('u2-code').then(()=>{
            html.value = code;
            html.onkeyup = html.onblur = function(){
                el.innerHTML = html.value.replace(/\s*\uFEFF\s*/g,'');
                el.dispatchEvent(new Event('input',{'bubbles':true,'cancelable':true}));
            }
            // wrapper.c1ZTop();
        });

        function hide(e) {
            if (e.key==='Escape' || e.target !== html) {
                wrapper.remove();
                document.removeEventListener('keydown',hide);
                document.removeEventListener('mousedown',hide);
                el.focus();
            }
        };
        document.addEventListener('keydown',hide);
        document.addEventListener('mousedown',hide);
    },
    shortcut:'h'
});
