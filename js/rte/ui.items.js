

import {$range} from './range.js';
import * as state from './events.js';

/*
let x = my.setItem('Bold',
	{
		shortcut:'l'
	}
);
x.addEventListener('mousedown', function() {
	Rte.modifySelection(function(els) {
		let first = $(els[1]||els[0]);
		let act = first.hasClass('SmallText') ? 'removeClass' : 'addClass';
		for (let i = els.length, el; el = els[--i];) {
			$(el)[act]('SmallText');
		}
	});
});
*/

let active = null;
addEventListener('u2-rte-activate', function(e) {
	active = e.target;
});	

const blocklessElements = {
    'P':1,
    'H1':1,
    'H2':1,
    'H3':1,
    'H4':1,
    'H5':1,
    'H6':1,
    'SPAN':1,
    'BUTTON':1,
    'B':1,
    'I':1,
    'STRONG':1,
    'LABEL':1,
    'A':1,
	'BUTTON':1,
}

const lang = {
	'Bold':{
		de: 'Fett',
		en: 'Bold',
		fr: 'Gras',
	},
	'Italic':{
		de: 'Kursiv',
		en: 'Italic',
		fr: 'Italique',
	},
	'Insertunorderedlist':{
		de: 'Liste',
		en: 'List',
		fr: 'Liste',
	},
	'Insertorderedlist':{
		de: 'Nummerierte Liste',
		en: 'Numbered List',
		fr: 'Liste numérotée',
	},
	'Underlined':{
		de: 'Unterstrichen',
		en: 'Underlined',
		fr: 'Souligné',
	},
	'Hr':{
		de: 'Horizontale Linie',
		en: 'Horizontal Rule',
		fr: 'Ligne horizontale',
	},
	'Strikethrough':{
		de: 'Durchgestrichen',
		en: 'Strikethrough',
		fr: 'Barré',
	},
	'Format':{
		de: 'Format',
		en: 'Format',
		fr: 'Format',
	},
	'Style':{
		de: 'Stil',
		en: 'Style',
		fr: 'Style',
	},
	'Removeformat':{
		de: 'Formatierungen entfernen',
		en: 'Remove formatting',
		fr: 'Supprimer le formatage',
	},
	'Table':{
		de: 'Tabelle einfügen',
		en: 'Insert table',
		fr: 'Insérer un tableau',
	},
	'Link':{
		de: 'Link',
		en: 'Link',
		fr: 'Lien',
	},
}

Rte.ui.setItem('Bold', 					{cmd:'bold',		shortcut:'b', xenable:':not(img)', labels:lang.Bold});
Rte.ui.setItem('Italic', 				{cmd:'italic',		shortcut:'i', xenable:':not(img)', labels:lang.Italic});
Rte.ui.setItem('Underlined', 			{cmd:'underline',	shortcut:'u', xenable:':not(img)', labels:lang.Underlined});
Rte.ui.setItem('Strikethrough', 		{cmd:'strikethrough', xenable:':not(img)', labels:lang.Strikethrough});
Rte.ui.setItem('Insertunorderedlist',	{cmd:'insertunorderedlist',shortcut:'8', icon:'format-list-bulleted', enable(){ return !blocklessElements[active.tagName]; }, labels:lang.Insertunorderedlist});
Rte.ui.setItem('Insertorderedlist',		{cmd:'insertorderedlist',shortcut:'9', icon:'format-list-numbered', enable(){ return !blocklessElements[active.tagName]; } , labels:lang.Insertorderedlist});
//Rte.ui.setItem('Undo', 					{cmd:'undo',	check:false, icon:'undo'});
//Rte.ui.setItem('Redo', 					{cmd:'redo',	check:false, icon:'redo'});
Rte.ui.setItem('Hr', 					{cmd:'inserthorizontalrule', check:false, icon:'horizontal-rule', enable(){ return !blocklessElements[active.tagName]; }, labels:lang.Hr});

import('./ui/items/undo.js');
import('./ui/items/code.js');
import('./ui/items/ai.js');

/* Headings */
{
	const lang = document.documentElement.getAttribute('lang') || navigator.language.substring(0,2) || 'en';
	const formatTrans = {
		p: {de:'Absatz', en:'Paragraph', fr:'Paragraphe'},
		h1: {de:'Überschrift 1', en:'Heading 1', fr:'Titre 1'},
		h2: {de:'Überschrift 2', en:'Heading 2', fr:'Titre 2'},
		h3: {de:'Überschrift 3', en:'Heading 3', fr:'Titre 3'},
		h4: {de:'Überschrift 4', en:'Heading 4', fr:'Titre 4'},
		h5: {de:'Überschrift 5', en:'Heading 5', fr:'Titre 5'},
		h6: {de:'Überschrift 6', en:'Heading 6', fr:'Titre 6'},
	};
	let opts = Rte.ui.setSelect('Format',{
		click(e) {
			const tag = e.target.getAttribute('value');
			tag && document.execCommand('formatblock',false,tag);
		},
		check() {
			const stat = document.queryCommandValue('formatblock');
			for (const el of opts.children) {
				el.className = el.tagName.toLowerCase()===stat ? '-selected' : '';
			}
			const show = formatTrans[stat]?.[lang] || formatTrans[stat]?.en || 'Format';
			opts.previousElementSibling.innerHTML = state.element ? show : 'Format';
		},
		enable(e) {
			return !blocklessElements[active.tagName];
		}
	});
	opts.innerHTML = Object.entries(formatTrans).map(([tag, trans]) => `<${tag} value=${tag}>${trans[lang]??trans.en}</${tag}>`).join('');
}
/* CSS classes */
// {
// 	function useClass(cl) { return cl.match(/^[A-Z]/); };
// 	let hasClasses; /* check if this-handle is used */
// 	let check = function(el) {
// 		let classes = getPossibleClasses(el);
// 		for (let cl of Object.keys(classes)) {
// 			hasClasses = hasClasses || useClass(cl);
// 		}
// 		sopts.parentElement.style.display = hasClasses ? '' : 'none';
// 	}.c1Debounce(150);

// 	let sopts = Rte.ui.setSelect('Style', {
// 		check() {
// 			check();
// 			let classes = state.element && state.element.className.split(' ').filter(useClass).join(' ') || 'Style';
// 			sopts.previousElementSibling.innerHTML = classes;
// 		},
// 		click() {
// 			sopts.innerHTML = '';
// 			let el = qgSelection.isElement() || getSelection().isCollapsed ? state.element : null;
// 			// if (el === active) return;
// 			let classes = getPossibleClasses(el);
// 			for (let sty of Object.keys(classes)) {
// 				if (!useClass(sty)) return;
// 				let has = el && el.classList.contains(sty);
// 				let d = c1.dom.fragment('<div class="'+sty+'">'+sty+'</div>').firstChild;
// 				sopts.append(d);
// 				has && d.classList.add('-selected');
// 				d.onmousedown = function() {
// 					Rte.manipulate(()=>{
// 						if (!el) {
// 							el = qgSelection.surroundContents(document.createElement('span'));
// 						}
// 						el.classList.toggle(sty, !has);
// 					});
// 				};
// 				// d.css({
// 				// 	fontSize:parseInt(d.css('fontSize')).limit(9,18),
// 				// 	margin:parseInt(d.css('margin')).limit(0,4),
// 				// 	padding:parseInt(d.css('padding')).limit(0,4),
// 				// 	letterSpacing:parseInt(d.css('letterSpacing')).limit(0,11),
// 				// 	borderWidth:parseInt(d.css('borderWidth')).limit(0,4)
// 				// });
// 			}
// 		}
// 	});
// }

/* show invisibles *
{
	function replaceContents(node){
		for (const el of node.childNodes) replaceNode(el);
	}
	function replaceNode(node) {
		if (node.nodeType === 3) { // text-nodes
			let offset = 0;
			for (const char of node.data) {
				if (char === '\xa0') {  // nbsp
					//var x = node.splitText(offset);
				}
				++offset;
			}
		} else {
			replaceContents(node);
		}
	}
	Rte.ui.setItem('ShowInvisibleChars', {
		click(e) {
			let root = active;
			replaceContents(root);
		}
		,shortcut:'space'
	});
}
/* clean / remove format */
{
	const removeTags = ['FONT','O:P','SDFIELD','SPAN'].reduce((obj, item)=>{ obj[item]=1; return obj; }, {});
	const removeAttrs = ['style','class','align','valign','border','cellpadding','cellspacing','bgcolor'];
	function cleanNode(node) {
	    if (!node) return;
		cleanContents(node);
	    node.nodeType === Node.COMMENT_NODE && node.remove();
		if (node.nodeType === Node.ELEMENT_NODE) {
			removeTags[node.tagName] && node.removeNode();
			removeAttrs.forEach(attr=>node.removeAttribute(attr));
			if (node.tagName !== 'IMG') ['width','height'].forEach(attr=>node.removeAttribute(attr))
		}
	}
	function cleanContents(node){
		if (node.childNodes) for (let child of node.childNodes) cleanNode(child);
	}
	Rte.ui.setItem('Removeformat', {
		click() {
			const root = state.range.callapsed ? active : state.range.commonAncestorContainer;
			cleanContents(root);
		},
		shortcut:'space',
		icon: 'format-clear',
		labels: lang.Removeformat
	});
}


/* insert table */
Rte.ui.setItem('Table', {
	icon: 'grid-on',
	click() {
		let table = document.createElement('table');
		table.innerHTML = '<tr><td>&nbsp;<td>&nbsp;<tr><td>&nbsp;<td>&nbsp;';
		$range(state.range).deleteContents().insert(table).collapse(table.querySelector('td'),0).select();
	},
	enable(){
		return !blocklessElements[active.tagName];
	},
	labels: lang.Table
});


/* Target *
Rte.ui.setItem('LinkTarget', {
	enable:'a, a > *',
	check(el) {
		el = el.closest('a');
		let target = el.getAttribute('target');
		return target && target !== '_self';
	},
	click(){
		let el = state.element.closest('a');
		let active = this.el.classList.contains('active');
		el.setAttribute('target', active?'_self':'_blank');
		Rte.trigger('input');
		active.focus();
		Rte.trigger('elementchange');
	},
	el: c1.dom.fragment('<div class="-item -button">Link in neuem Fenster</div>').firstChild
});
/* Titletag *
{
	let el = c1.dom.fragment('<table style="clear:both"><tr><td style="width:84px">Titel<td><input>').firstChild;
	let inp = el.c1Find('input');
	inp.addEventListener('keyup', function() {
		state.element.setAttribute('title',inp.value);
		!inp.value && state.element.removeAttribute('title');
		Rte.trigger('input');
	});
	Rte.ui.setItem('AttributeTitle',{
		check(el) {
			inp.value = el ? el.getAttribute('title') : '';
		},
		el: el
	});
}

// /* Image Attributes */
// { 
// 	let inp = document.createElement('table');
// 	inp.innerHTML =
// 		'<tr><td style="width:84px">Breite:<td><input class=-x>'+
// 		'<tr><td>Höhe:<td><input class=-y>'+
// 		'<tr><td title="Alternativer Text">Alt-Text:<td><input class=-alt>';

// 	inp.addEventListener('keyup',e=>{
// 		let img = state.element;
// 		img.style.width  = inp.querySelector('.-x').value+'px';
// 		img.style.height = inp.querySelector('.-y').value+'px';
// 		img.setAttribute('alt', inp.querySelector('.-alt').value);
// 		if (e.target.classList.contains('-x') || e.target.classList.contains('-y')) {
// 			state.element.dispatchEvent(new Event('qgResize',{bubbles:true}));
// 		}
// 		active.dispatchEvent(new Event('input',{'bubbles':true,'cancelable':true})); // used!
// 	})
// 	Rte.ui.setItem('ImageDimension', {
// 		check(el) {
// 			inp.querySelector('.-x').value = el.offsetWidth;
// 			inp.querySelector('.-y').value = el.offsetHeight;
// 			inp.querySelector('.-alt').value = el.getAttribute('alt');
// 		},
// 		el:inp,
// 		enable:'img'
// 	});
// }
/* Image Attributes */
{
	const el = document.createElement('label');
	el.innerHTML = '<small>Alternativer Text:</small><input placeholder="Alternative Text">';
	let inp = el.querySelector('input');
	inp.addEventListener('keyup',e=>{
		let img = state.element;
		img.setAttribute('alt', inp.value);
		active.dispatchEvent(new Event('input',{'bubbles':true,'cancelable':true}));
	})
	Rte.ui.setItem('alt-text', {
		check(el) {
			inp.value = el.getAttribute('alt');
		},
		el:el,
		enable:'img'
	});
}


/* original image *
const imgSizeCache = {};
function ImageRealSize(url, cb) {
	if (!imgSizeCache[url]) {
		const nImg = new Image();
		nImg.src = url;
		nImg.onload = function() {
			cb.apply(null, imgSizeCache[url] = [nImg.width, nImg.height]);
		};
	} else {
		cb.apply(null,imgSizeCache[url]);
	}
}
Rte.ui.setItem('ImgOriginal', {
	enable: 'img',
	click(e) {
		let img = state.element;
		let url = img.getAttribute('src').replace(/\/(w|h|zoom|vpos|hpos|dpr)-[^\/]+/g,'');
		ImageRealSize(url, function(w,h) {
			w /= 2; h /= 2; // vorgängig wird dem Server per Cookie mitteilt, dass er die doppelte Auflösung ausliefern soll
			make(w,h);
		});
		function make(w,h) {
			img.setAttribute('src',url);
			img.setAttribute('width',w);
			img.setAttribute('height',h);
			img.style.width = '';
			img.style.maxWidth = '100%';
			img.style.height = 'auto';
			state.element.dispatchEvent(new Event('qgResize',{bubbles:true})); // new
			Rte.trigger('input');
			Rte.trigger('elementchange');
		}
	},
	el: c1.dom.fragment('<span class="-item -button" title="Originalgrösse">Originalbild</span>').firstChild
});

/* table handles *
import {TableHandles} from '../c1/tableHandles.mjs?qgUniq=bbcd4cc';
{
	let td, tr, table, index;
	let handles = new TableHandles();
	Rte.on('deactivate',() => handles.hide() );
	function positionize() {
		let e = state.element;
		if (!e) return;
		td = e.closest('td');
		if (active && active.contains(td)) {
			tr = td.parentNode;
			table = tr.closest('table');
			index = td.cellIndex;
			handles.showTd(td);
		} else {
			handles.hide();
		}
	}
	Rte.on('elementchange activate', positionize);
	handles.root.addEventListener('click',e=>{
		if (e.target.classList.contains('-rowRemove')) {
			tr.remove();
		}
		if (e.target.classList.contains('-rowAdd')) {
			const tr2 = tr.cloneNode(true);
			tr.after(tr2)
		}
		if (e.target.classList.contains('-colRemove')) {
			const trs = table.c1FindAll('> * > tr');
			for (const tr of trs) tr.children[index].remove();
		}
		if (e.target.classList.contains('-colAdd')) {
			const trs = table.c1FindAll('> * > tr');
			for (const tr of trs) {
				const td = c1.dom.fragment('<td><br></td>'); // firefox needs <br> to be able to navigate to the cell
				tr.children[index].after(td);
			}
		}
		const hasTds = table.c1FindAll('> * > tr > *').length;
		!hasTds && table.remove();
		getSelection().modify('move', 'right', 'character'); // chrome bug
		getSelection().modify('move', 'left', 'character');
		Rte.checkSelection();
	});
}
/* */

// Rte.ui.config = { zzz
// 	rteDef:{
// 		main:['LinkInput','Bold','Italic','Insertunorderedlist','Insertorderedlist','Link','Removeformat','Format','Style','Strikethrough','Underlined','Hr','Code','Table','Shy',/*'ShowInvisibleChars',*/'LinkTarget','ImgOriginal','ImgOriginalRetina',/*'AttributeTitle',*/'ImageDimension','Tree']
// 	},
// };



/* *
{ // show shy, todo: deprecated? css hyphens and text-wrap:balance are widely supported
	Rte.ui.setItem('Shy',{
		click() {
			const span = document.createElement('span');
			span.className = 'qgRte-mark-char -Shy';
			span.textContent = '\u00AD';
			$range(state.range).deleteContents().insert(span).collapse().select();
		},
		labels: {
			de: 'Weiches Trennzeichen einfügen',
			en: 'Insert soft hyphen',
			fr: 'Insérer un trait d\'union doux',
		},
		//el: c1.dom.fragment('<div class="-item -button">Weiches Trennzeichen einfügen</div>').firstChild
	});
	const style = document.createElement('style');
	style.innerHTML = '.qgRte-mark-char.-Shy::after  { content:"-"; display:inline-block; color:#f88; opacity:.6; } ';
	document.head.appendChild(style);

	function addMarks(){
		// remove
		var anchor = getSelection().anchorNode;
		if (!anchor) return;
		anchor.parentNode.querySelectorAll('.qgRte-mark-char').forEach(function(marker){
			if (!marker.firstChild) marker.remove();
		});

		//matchText(active, new RegExp('\u00AD|\u00a0', 'g'), function(node, match, offset) {
		matchText(active, new RegExp('\u00AD', 'g'), function(node, match, offset) {
			if (node.parentNode.classList.contains('qgRte-mark-char')) return false;
			var span = document.createElement('span');
			span.className = 'qgRte-mark-char';
			if (match === '\u00AD') span.className += ' -Shy';
			//if (match === '\u00a0') span.className += ' -Nbsp';
			span.textContent = match;
			return span;
		});
	}
	function removeMarks(){
		active.querySelectorAll('.qgRte-mark-char').forEach(el=>el.removeNode())
		active.normalize();
	}
	Rte.on('activate',addMarks);
	Rte.on('input',addMarks);
	Rte.on('deactivate',removeMarks);


	var matchText = function(node, regex, callback, excludeElements) {
		excludeElements || (excludeElements = ['script', 'style', 'iframe', 'canvas']);
		var child = node.firstChild;
		while (child) {
			if (child.nodeType === 1) {
				if (excludeElements.indexOf(child.tagName.toLowerCase()) > -1) break;
				matchText(child, regex, callback, excludeElements);
			}
			if (child.nodeType === 3) {
				var bk = 0;
				child.data.replace(regex, function(str) {
					var args = [].slice.call(arguments);
					var tag = callback.apply(window, [child].concat(args));
					if (!tag) return false;
					var offset = args[args.length - 2];
					var newTextNode = child.splitText(offset+bk);
					bk -= child.data.length + str.length;
					newTextNode.data = newTextNode.data.substr(str.length);
					child.parentNode.insertBefore(tag, newTextNode);
					child = newTextNode;
				});
				regex.lastIndex = 0;
			}
			child = child.nextSibling;
		}
		return node;
	};

}
/* */

/* *
{ // show line-breaks
	const style = document.createElement('style');
	style.innerHTML = 
		'.qgRte-mark-char.-Br::before { '+
		'	content:"↵";'+
		'	display:inline;'+
		'	display:contents;'+
		'	opacity:.3;'+
		'	margin-left:.2em; '+
		'	font-size:.82em; '+
		'	pointer-events:none; '+ // I don't think it'll do any good
		'}'
	document.head.appendChild(style);
	// document.head.append(
	// 	c1.dom.fragment(
	// 	'<style>'+
	// 	'.qgRte-mark-char.-Br::before { '+
	// 	'	content:"↵";'+
	// 	'	display:inline;'+
	// 	'	display:contents;'+
	// 	'	opacity:.3;'+
	// 	'	margin-left:.2em; '+
	// 	'	font-size:.82em; '+
	// 	'	pointer-events:none; '+ // I don't think it'll do any good
	// 	'}'+
	// 	'</style>')
	// );
	function addMarks(){
		if (!active) return;
		active.querySelectorAll('br').forEach(br=>{
			if (br.previousElementSibling?.classList.contains('-Br')) return;
			const span = document.createElement('span');
			span.className = 'qgRte-mark-char -Br';
			br.before(span);
		});
	}
	addEventListener('u2-rte-activate',addMarks);
	addEventListener('u2-rte-deactivate',addMarks);
	//Rte.on('activate',addMarks);
	//Rte.on('input',addMarks);
}
/* */
