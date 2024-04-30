import {$range} from '../../range.js';
import * as state from '../../events.js';

const dialog = document.createElement('dialog');
dialog.id = 'qgRteHtml';
dialog.innerHTML = 
    '<u2-code class=-editor editable language=html></u2-code>'+
    //'<textarea class=-editor spellcheck=false class=c1Rst style="width:100%; height:50vh"></textarea>'+
    '<style>'+
    '	#qgRteHtml { max-width:none; width:auto; border:0; inset:auto .5rem .5rem .5rem; background:#fff; color:#000; box-shadow:0 0 20px; padding:0; } '+
    '	#qgRteHtml > .-editor { font-size:11.5px monospace; padding:1vw; margin:0; } '+
    '</style>';
    
const editor = dialog.firstChild;

Rte.ui.setItem('Code', {
    icon: 'code',
    click() {
        const el = state.active;

        document.documentElement.append(dialog);
        dialog.showModal();

        function hide(e) {
            if (e.key==='Escape' || e.target !== editor) {
                dialog.close();
                dialog.remove();
                document.removeEventListener('keydown',hide);
                document.removeEventListener('mousedown',hide);
                el.focus();
            }
        }
        document.addEventListener('keydown',hide);
        document.addEventListener('mousedown',hide);

        let indentHtml2 = null;
        Promise.all([
            import('../../util/indentHtml.js'),
            import('../../../../../el/code/code.js'),
        ]).then(([indentHtml]) => {
            indentHtml2 = indentHtml;
            return customElements.whenDefined('u2-code');
        }).then(()=>{
            return new Promise(resolve=>{setTimeout(resolve,20)});
        }).then(()=>{
    
            const {code, start, end} = getInnerHTMLAndPositionsByRange(el, state.range, indentHtml2.indent);
    
            editor.value = code;
            editor.onkeyup = editor.onblur = function(){
                el.innerHTML = indentHtml2.unindent(editor.value);
                //el.dispatchEvent(new Event('input',{'bubbles':true,'cancelable':true})); // needed?
            }
            editor.focus();
            editor.setSelectionRange(start, end);

            const lines = code.substring(0, start).split("\n").length - 1;
            const lineHeight = parseInt(window.getComputedStyle(editor).lineHeight);

            setTimeout(()=>{ // without timeout it works only the first time
                editor.scrollTop = lines * lineHeight;
            });

        });

    },
    shortcut:'h'
});



function getInnerHTMLAndPositionsByRange(el, range, manipulate) {
    range = $range(range);
    const startId = 'marker_start_so9df8as0f0';
    const endId   = 'marker_end_laseg08a0egga';
    const startTextNode = document.createTextNode(startId);
    const endTextNode   = document.createTextNode(endId);
    
    range.cloneRange().collapse(false).insertNode(endTextNode);
    range.cloneRange().collapse(true).insertNode(startTextNode);

    let code = manipulate?.(el.innerHTML) || el.innerHTML;

    startTextNode.remove();
    endTextNode.remove();

    const start = code.indexOf(startId);
    code = code.replace(startId,'');
    const end = code.indexOf(endId);
    code = code.replace(endId,'');

    return {code, start, end};
}
