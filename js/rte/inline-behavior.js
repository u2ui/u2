
import './events.js';
import {$range} from './range.js';

// /* cleaner */
// {
// 	let Cleaner;
// 	Rte.on('input', function() {
// 		if (!Cleaner) Cleaner = new c1.NodeCleaner();
// 		Cleaner.cleanContents(Rte.active, true);
// 	});
// }

/* force li's in contenteditable uls */
{
	let active;
	let check = function(e){
		let child;
		for (child of active.childNodes) {
			if (child.tagName === 'LI') continue;
			if (child.nodeType === 3 && !child.textContent.trim()) continue;
			if (child.nodeName === 'UL') {
				child.removeNode();
				continue;
			}
			let li = document.createElement('li');
			child.before(li);
			li.append(child);
		}
	}
	addEventListener('u2-rte-activate', function(event) {
		if (event.target.tagName !== 'UL') return;
		active = event.target;
		check()
		event.target.addEventListener('input', check);
	});
	addEventListener('u2-rte-deactivate', function(event) {
		if (event.target.tagName !== 'UL') return;
		event.target.removeEventListener('input', check);
	});
}


/* force p tag inside contenteditable divs */
// const inlineElements = {A:1,ABBR:1,ACRONYM:1,B:1,BDO:1,BIG:1,BR:1,BUTTON:1,CITE:1,CODE:1,DFN:1,EM:1,I:1,IMG:1,INPUT:1,KBD:1,LABEL:1,MAP:1,OBJECT:1,Q:1,SAMP:1,SCRIPT:1,SELECT:1,SMALL:1,SPAN:1,STRONG:1,SUB:1,SUP:1,TEXTAREA:1,TT:1,VAR:1};	
// function isInline(node) {
// 	return node.nodeType === 3 || inlineElements[node.tagName];
// }
// function forceChildren(container, tag) {
// 	// group inline elements and text-nodes to wrap them with tag
// 	let newElement = null;
// 	for (const node of [...container.childNodes]) { // need an array because children changes
// 		if (isInline(node)) {
// 			if (!newElement) {
// 				newElement = document.createElement(tag);
// 				node.before(newElement);
// 			}
// 			newElement.append(node);
// 		} else {
// 			newElement = null;
// 		}
// 	}
// }
// // addEventListener('u2-rte-activate', function(event) {
// 	if (event.target.tagName !== 'DIV') return;
// 	forceChildren(event.target, 'p');
// });

document.addEventListener('input',function(e){
	if (!e.target.isContentEditable) return;
	if (e.target.tagName !== 'DIV') return;
	const range = $range.fromSelection();
	const text = range.startContainer;
	const offset = range.startOffset;
	if (text.nodeType !== 3) return; /* text-node */
	if (text.parentNode === e.target) { // warp blank text-nodes with p
		const p = document.createElement('p');
		text.after(p);
		p.append(text);
		range.setStart(text, offset);
		range.select();
	} else { // replace every div with a p
		const div = text.parentNode;
		if (div.tagName !== 'DIV') return;
		//if (div.parentNode !== e.target) return;
		const p = document.createElement('p');
		div.after(p);
		p.append(div)
		div.removeNode();
		range.setStart(text, offset);
		range.select();
	}
});



/* force p's to not contain a ul  (NEEDED?)  */
document.addEventListener('input',function(e){
	if (!e.target.isContentEditable) return;
	if (e.target.tagName !== 'DIV') return;

	const range = $range.fromSelection();
	const text = range.startContainer;
	const offset = range.startOffset;

	if (text.nodeType !== 3) return; // text-node
	const ul = text.parentNode.parentNode;
	if (ul.tagName !== 'UL') return;
	const p = ul.parentNode;
	if (p.tagName !== 'P') return;
	if (p.childNodes.length !== 1) return;
	p.removeNode();

	range.setStart(text, offset).select();
});

/* force br's tag inside contenteditable */
const elementWithParagraphs = {DIV:1,TD:1,TH:1,LI:1,MAIN:1,ARTICLE:1,SECTION:1,ASIDE:1,HEADER:1,FOOTER:1,DETAILS:1};
document.addEventListener('keydown',function(e){
	if (!e.target.isContentEditable) return;
	if (e.code !== 'Enter') return;
	if (elementWithParagraphs[e.target.tagName]) return;
	const br = document.createElement('br');
	$range.fromSelection().deleteContents().insert(br).collapse().select();
	e.preventDefault();
},true);

/* prevent links inside links */
document.addEventListener('input',function(e){
	if (!e.target.isContentEditable) return;
	if (!e.target.closest('A')) return;
	let a;
	while (a = e.target.c1Find('a')) a.removeNode();
});

/* prevent phx inside phx */
{
	let PHX = {P:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,};
	document.addEventListener('input',function(e){
		if (!e.target.isContentEditable) return;
		const check = function(node) {
			Array.from(node.children).forEach(check); // for of will skip nodes (if some removed)
			if (isPHX(node.parentNode) && isPHX(node)) {
				if (node.nextElementSibling) {
					node.after(document.createElement('br'));
				}
				node.removeNode();
			}
		}
		function isPHX (node){
			return PHX[node.tagName];
		}
		check(e.target)
	});
}
/* */


// qgExecCommand('enableInlineTableEditing', false, false); // bug: if i first click in the table the nativ handles appear
// document.addEventListener('DOMContentLoaded',function(){
// 	qgExecCommand('enableObjectResizing', false, false);
// });

// /* prevent select on contextmenu */ (done in fixes)
// document.addEventListener('mousedown', e =>
// 	e.button === 2 && e.target.isContentEditable && e.preventDefault()
// );
