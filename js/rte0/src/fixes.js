/*
some fixes, for better contenteditable-handling
*/
import {$range} from './range.js';

// prevent contextmenu to change selection
document.addEventListener('mousedown', e=>{
    e.button === 2 && e.target.isContentEditable && e.preventDefault();
});


// if contenteditable inside interactive (link, button)
document.addEventListener('click', e=>{
	if (e.button !== 0) return;
	e.target.isContentEditable && e.preventDefault();
	// keyboard click firefox
	try { // on date-inputs explicitOriginalTarget fails because its internal, ignore it
		if (e.explicitOriginalTarget && e.explicitOriginalTarget.isContentEditable) {
			e.preventDefault();
		}
	} catch {}
});

// fixes Firefox:
// - placing cursor incorrectly
// - tab-key does not focus next element
function removeClosestHref(e){
	if (!e.target.isContentEditable) return;
	const link = e.target.closest('a');
	if (!link) return;
	if (!link.hasAttribute('href')) return;
	const href = link.getAttribute('href');
	link.removeAttribute('href');
	e.target.addEventListener('focusout', function(){
		link.setAttribute('href', href);
	}, {once:true});
}
addEventListener('mousedown', removeClosestHref, true);
addEventListener('focusin', removeClosestHref, true);



// Space: insert space (firefox)
// Enter: insert br (firefox chrome)
// https://jsfiddle.net/uh7bseLv/46/

// element inside contenteditable todo?:
// https://jsfiddle.net/k2zrp3Lw/3/
// 7.12.23 this seams to be fixed
/* */
document.addEventListener('keydown', e=>{
	if (e.defaultPrevented) return;
	if (e.key !== ' ' && e.key !== 'Enter') return;
	if (!e.target.isContentEditable) return;
	if (!e.target.closest('button')) return;
	let changedSomething = false;
	function checkInput(){ changedSomething = true }
	e.target.addEventListener('input',checkInput);
	requestAnimationFrame(()=>{ // setTimeout sometimes after seconds called!
		e.target.removeEventListener('input',checkInput);
		if (changedSomething) return;
        const range = $range.fromSelection();
        let node = null;
        if (e.key === ' ') {
            const char = range.startOffset && range.cloneRange().setStart(range.startContainer, range.startOffset-1).toString();
			if (char === ' ' || char === '\t' || char === '\n') {
                node = '\u00a0';
            } else {
                node = ' ';
            }
        }
        if (e.key === 'Enter') {
            node = document.createElement('br');
        }
        range.deleteContents().insert(node).collapse().select();
	});
});


// img selectable (webkit,blink) and resize handles
document.addEventListener('mousedown', e=>{
	if (e.button !== 0) return;
	if (!e.target.isContentEditable) return;
	if (e.target.tagName === 'IMG') {
		$range().selectNode(e.target).select();
		qgImageResizeUi(e);
	}
}, true); // capture => if inside stoppropagation


{
	let checkIntr;
	let img = null;
	window.qgImageResizeUi = function(e) {
		img = e.target;
		let hide = function(e) {
			if (!e || e.target!==img) {
				cont.remove();
				document.removeEventListener('mousedown',hide);
			}
		};
		document.addEventListener('mousedown',hide);
		document.body.append(cont);
//		cont.c1ZTop();
		positionize();
		function check() {
			cont.parentNode && img.offsetHeight ? positionize() : (hide(), clearInterval(checkIntr));
		}
		clearInterval(checkIntr);
		checkIntr = setInterval(check, 100);
	};
	let positionize = function() {
		let c      = img.getBoundingClientRect(), // todo: fastdom
			body   = document.documentElement.getBoundingClientRect(),
			bottom = c.bottom - body.top  - 8,
			right  = c.right  - body.left - 8;
		requestAnimationFrame(()=>{
			X.style.left    = right + 'px';                       X.style.top    = (bottom - img.offsetHeight / 2) + 'px';
			Y.style.left    = (right - img.offsetWidth / 2)+'px'; Y.style.top    = bottom + 'px';
			XY.style.left   = right + 'px';                       XY.style.top   = bottom + 'px';
			info.style.left = right + 16 + 'px';                  info.style.top = bottom + 16 + 'px';
		});
	};
	let startFn = function(e) {
		let startM   = {x: e.pageX, y: e.pageY};
		let startDim = {x: img.offsetWidth, y: img.offsetHeight};
		let dragger = e.target;
		let moveFn = function(e) {
			let w = dragger === Y ? startDim.x : Math.max(1, startDim.x + e.pageX - startM.x);
			let h = dragger === X ? startDim.y : Math.max(1, startDim.y + e.pageY - startM.y);
			if (!e.ctrlKey && dragger === XY) {
				if (startDim.x / startDim.y < w / h) {
					h = parseInt(startDim.y / startDim.x * w);
				} else {
					w = parseInt(startDim.x / startDim.y * h);
				}
			}
			let dh = parseFloat(h - startDim.y);
			let dw = parseFloat(w - startDim.x);
			requestAnimationFrame(()=>{
				img.style.width  = w + 'px';
				img.style.height = h + 'px';
				info.innerHTML = w+' x '+h+' ('+(dw>0?'+'+dw:dw)+','+(dh>0?'+'+dh:dh)+')';
				info.style.display = 'block';
//				info.c1ZTop();
			})
			positionize();
		};
		let stopFn = function() {
			img.dispatchEvent(new Event('qgResize',{bubbles:true}));
			document.removeEventListener('mousemove', moveFn);
			document.removeEventListener('mouseup', stopFn);
		};
		document.addEventListener('mousemove', moveFn);
		document.addEventListener('mouseup', stopFn);
		e.preventDefault();
		e.stopPropagation();
	};
    const cont = document.createElement('div');
    cont.style.display = 'contents';
    const shadow = cont.attachShadow({mode: 'open'});
	const itemCss = ';position:absolute; background-color:#fff; border:1px solid black; height:16px; width:16px; box-sizing:border-box';
    shadow.innerHTML = 
        '<div class=-x  style="cursor:e-resize '+itemCss+'"></div>'+
        '<div class=-y  style="cursor:s-resize '+itemCss+'"></div>'+
        '<div class=-xy style="cursor:se-resize'+itemCss+'" title="press ctrl to disable aspect ratio"></div>'+
        '<div class=-info style="position:absolute; background: #fafafa; box-shadow:0 0 3px; font-size:11px; color:#333; padding:2px 4px; border-radius:2px"></div>';
    let X  = shadow.querySelector('.-x');
    let Y  = shadow.querySelector('.-y');
    let XY = shadow.querySelector('.-xy');
    let info = shadow.querySelector('.-info');
	cont.addEventListener('mousedown', startFn);
}


/* contenteditable focus bug */
if (/AppleWebKit\/([\d.]+)/.exec(navigator.userAgent) && document.caretRangeFromPoint) {
    document.addEventListener('DOMContentLoaded', function(){
        let fixEl = document.createElement('input');
        fixEl.style.cssText = 'width:1px;height:1px;border:none;margin:0;padding:0; position:fixed; top:0; left:0';
        fixEl.tabIndex = -1;
        let shouldNotFocus = null;
        function fixSelection(){
            document.body.appendChild(fixEl);
            fixEl.focus();
            fixEl.setSelectionRange(0,0);
            setTimeout(function(){
                document.body.removeChild(fixEl);
            },100)
        }
        function checkMouseEvent(e){
            if (e.target.isContentEditable) return;
            let range = document.caretRangeFromPoint(e.clientX, e.clientY);
			if (!range) return;
            let wouldFocus = getContentEditableRoot(range.commonAncestorContainer);
            if (!wouldFocus || wouldFocus.contains(e.target)) return;
            shouldNotFocus = wouldFocus;
            setTimeout(function(){
                shouldNotFocus = null;
            });
            if (e.type === 'mousedown') {
                document.addEventListener('mousemove', checkMouseEvent, false);
            }
        }
        document.addEventListener('mousedown', checkMouseEvent, false);
        document.addEventListener('mouseup', function(){
                document.removeEventListener('mousemove', checkMouseEvent, false);
        }, false);
        document.addEventListener('focus', function(e){
            if (e.target !== shouldNotFocus) return;
            if (!e.target.isContentEditable) return;
            fixSelection();
        }, true);
        document.addEventListener('blur', function(e){
			if (e.target !== shouldNotFocus) return;
        	if (!e.target.isContentEditable) return;
        	setTimeout(function(){
        		if (document.activeElement === e.target) return;
        		if (!e.target.contains(getSelection().baseNode)) return;
                fixSelection();
        	})
	    }, true);
    });
}

function getContentEditableRoot(el) {
    if (el.nodeType === 3) el = el.parentNode;
    if (!el.isContentEditable) return false;
    while (el) {
        let next = el.parentNode;
        if (next.isContentEditable) {
            el = next;
            continue
        }
        return el;
    }
}

// firefox always inserts a br-tag at the end, todo: no final solution
/*
document.addEventListener('input',e=>{
	if (!e.target.isContentEditable) return;
	const last = e.target.lastChild;
	if (!last || last.tagName !== 'BR') return;
	last.after(' ');
	last.remove();
	if (e.target.lastChild == e.target.firstChild) {
		e.target.lastChild.remove();
	}
});
*/