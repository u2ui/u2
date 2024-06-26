
export function $range(range) { // better name? rProxy, rangeProxy, ranger
	if (!range) range = document.createRange();
    return new Proxy(range, handler);
}
$range.fromSelection = function(){
	return selection.rangeCount ? $range(selection.getRangeAt(0)) : null;
};

const handler = {
    get(range, prop, receiver){
		if (prop === 'original') return range;
		// extensions
        if (Object.hasOwn(extensions, prop)) {
			const extension = extensions[prop];
			if (extension.get) return extension.get.call(receiver);
			return extension.bind(receiver);
        }
		// original methods
		if (typeof range[prop] === 'function') {
            return function(...args){
				const ret = range[prop].apply(range, args);
				if (Object.hasOwn(chainedFns, prop)) return receiver;
				return ret;
            }
        }
		// original properties
		return range[prop];
    },
    set(range, prop, value){
		range[prop] = value;
        return true;
    }
}

const extensions = {
	affectedNode: { get(){
			let node = this.commonAncestorContainer;
			if (node.nodeType === 1 && node === this.startContainer && this.endOffset - this.startOffset === 1) {
				return node.childNodes[this.startOffset];
			}
			return node;
	}},
	affectedElement: { get(){
			const node = this.affectedNode;
			return node.nodeType === 1 ? node : node.parentElement;
	}},
	select(){
		selection.removeAllRanges();
		selection.addRange(this.original);
	},
	insert(node){
		// if (node instanceof Array) for (n of node) this.insert(n);
		// else {
		if (typeof node === 'string') { node = document.createTextNode(node); }
        console.log(node)
		this.insertNode(node);
		return this;
	},
    insertHtml(html){
        this.insert(this.original.createContextualFragment(html));
        return this;
    },
	cloneRange(){
		return $range(this.original.cloneRange());
	},
	boundingClientRect(){ // fixed getBoundingClientRect
		const r = this.original;
		let pos = r.getBoundingClientRect();
		if (r.collapsed && pos.top === 0 && pos.left === 0) {
			if (r.endContainer.nodeType === 1) {
                if (r.startContainer.tagName === 'HR') {
                    return r.startContainer.getBoundingClientRect();
                }

				const nextNode = r.endContainer.childNodes[r.endOffset];
                if (nextNode) {
                    if (nextNode.tagName === 'BR') { // if its a newline
                        return nextNode.getBoundingClientRect();
                    }
                    if (nextNode.tagName === 'HR') { // if its a newline
                        return nextNode.getBoundingClientRect();
                    }
                    if (nextNode.tagName === 'IMG') {
                        const rect = nextNode.getBoundingClientRect();
                        return {top: rect.top, bottom:rect.bottom, left: rect.left, right: rect.right, width: 0, height: rect.height};
                    }
                    if (nextNode.nodeType === 3) { // if its before a textnode (Do pseudo-elements get messed up? (::marker))
                        const nRange = document.createRange();
                        nRange.selectNodeContents(nextNode);
                        nRange.collapse(true);
                        const rect = nRange.getBoundingClientRect();
                        if (rect.top !== 0) {
                            return nRange.getBoundingClientRect();
                        }
                    }
                }
				const prevNode = r.endContainer.childNodes[r.endOffset-1];
                if (prevNode) {
                    if (prevNode.tagName === 'IMG') {
                        const rect = prevNode.getBoundingClientRect();
                        return {top: rect.top, bottom:rect.bottom, left: rect.right, right: rect.right, width: 0, height: rect.height};
                    }
                }
                if (prevNode.tagName === 'HR') { // if its a newline
                    return prevNode.getBoundingClientRect();
                }
        }
			console.warn('collapsed range, but no boundingClientRect', r, r.startContainer, r.startOffset, r.endContainer, r.endOffset);
			/* this is bad as it causes selectionchange and mutation events
			window.u2DomChangeIgnore = true;
			let tmpNode = document.createTextNode('\ufeff');
			r.insertNode(tmpNode);
			pos = r.getBoundingClientRect();
			r.setStartAfter(tmpNode);
			tmpNode.remove();
			requestAnimationFrame(()=> window.u2DomChangeIgnore = false );
			*/
		}
		return pos;
	},
	splitBoundaries() {
		let node = this.startContainer;
		if (node.data && this.startOffset > 0) {
			node.splitText(this.startOffset);
			this.setStartAfter(node);
		}
		node = this.endContainer;
		if (node.data && this.endOffset < node.data.length) {
			node.splitText(this.endOffset);
			this.setEndAfter(node);
		}
	},
	affectedRootNodes() {
		const r = this.original;
		let el = r.startContainer;
		if (el.nodeType === 1 && r.startOffset > 0) el = el.childNodes[r.startOffset];
		let end = r.endContainer;
		if (end.nodeType === 1 && r.endOffset < end.childNodes.length) end = end.childNodes[r.endOffset-1];
		const els = [];
		let prev = null;
		do {
			if (el === end) break;
			if (el.contains && el.contains(end)) continue;
			if (prev && prev.contains && prev.contains(el)) continue;
			prev = el;
			els.push(el);
		} while (el = nextNode(el))
		els.push(el);
		return els;
	},
	containingRootNodes() {
		this.splitBoundaries();
		return this.affectedRootNodes();
	},
	containingRootNodesForceElements() {
		var nodes = this.containingRootNodes(),
			newNodes = [];
		for (var i=0, el; el=nodes[i++];) { // todo: summarize following textNodes
			if (el.nodeType === 3) {
				if (el.data.trim() === '') continue;
				const nEl = document.createElement('span');
				el.parentNode.insertBefore( nEl, el );
				nEl.appendChild(el);
				el = nEl;
			}
			newNodes.push(el);
		}
		if (newNodes[0]) {
			this.setStartBefore(nodes[0]);
			this.setEndAfter(nodes[nodes.length-1]);
		}
		return newNodes;
	}
}


const selection = getSelection();

const chainedFns = {setStart:1,setStartBefore:1,setStartAfter:1,setEnd:1,setEndAfter:1,selectNode:1,selectNodeContents:1,insertNode:1,collapse:1,deleteContents:1};





const nextNode = function(node, direction) {
	var child   = direction==='start' ? 'lastChild'       : 'firstChild',
		sibling = direction==='start' ? 'previousSibling' : 'nextSibling';
	if (node[child]) return node[child];
	while (node) {
		if (node[sibling]) return node[sibling];
		node = node.parentNode;
	}
	return false;
};
const nextTextNode = function(node, direction) {
	do {
		node = nextNode(node, direction );
		if (node.nodeType === 3) return node;
	} while (node);
	return false;
};
const nextPosition = function(node, offset, direction) {
	if (direction==='start') {
		offset--;
		if (node.data === undefined || offset < 0) {
			node = nextTextNode(node, direction);
			offset = node.data.length-1;
		}
	} else {
		offset++;
		if (node.data === undefined || offset >= node.data.length) {
			node = nextTextNode(node, direction);
			offset = 0;
		}
	}
	return [node, offset];
};

// /* save / restore */
// range.prototype.save = function() {
// 	return {
// 		sC: this.oR.startContainer,
// 		sO: this.oR.startOffset,
// 		eC: this.oR.endContainer,
// 		eO: this.oR.endOffset,
// 		oR: this.oR,
// 		type:'q1SavedRange1'
// 	};
// };
// range.prototype.saveHard = function() {
// 	var sRange = this.oR.cloneRange();
// 	sRange.collapse(true);
// 	var sMarker = document.createElement('i');
// 	sMarker.id = 'q1Tmp_'+Math.random();
// 	sRange.insertNode(sMarker);

// 	var eRange = this.oR.cloneRange();
// 	eRange.collapse(false);
// 	var eMarker = document.createElement('i');
// 	eMarker.id = 'q1Tmp_'+Math.random();
// 	eRange.insertNode(eMarker);
// 	return {
// 		startMarker: sMarker.id,
// 		endMarker: eMarker.id,
// 		type: 'q1SavedRangeHard'
// 	};
// };
// range.prototype.restore = function(saved) {
// 	if (saved.type==='q1SavedRange1') {
// 		this.oR.setStart(saved.sC,saved.sO);
// 		this.setEnd(saved.eC,saved.eO);
// 	} else if (saved.type==='q1SavedRangeHard') {
// 		var sMarker = document.getElementById(saved.startMarker);
// 		var eMarker = document.getElementById(saved.endMarker);
// 		this.oR.setStartBefore( sMarker );
// 		this.oR.setEndAfter( eMarker );
// 		this.setEndAfter(eMarker);
// 		sMarker.remove();
// 		eMarker.remove();
// 	}
// 	return this;
// };







// range.prototype.findElement = function() {
// 	var r = this.oR;
// 	if (r.startContainer.nodeType === 1 && r.endOffset-r.startOffset === 1) {
// 		return r.startContainer.childNodes[r.startOffset];
// 	}

// 	// walk thru white-spaces
// 	var sNode = this.oR.startContainer;
// 	var eNode = this.oR.endContainer;

// 	if (sNode.nodeType===3 && sNode.data.substr(this.oR.startOffset).trim()==='') {
// 		sNode = nextNode(sNode,'end');
// 	}
// 	do {
// 		if (!sNode) break;
// 		if (sNode === eNode
// 			|| sNode.tagName === 'IMG'
// 			|| (sNode.nodeType === 3 && sNode.data.trim() !== '')) {
// 			break;
// 		}
// 	} while (sNode = nextNode(sNode,'end'))


// 	if (eNode.nodeType === 3) {
// 		if (eNode.data.substr(0, this.oR.endOffset).trim() === '') {
// 			eNode = eNode.previousSibling;
// 		}
// 	} else {
// 		eNode = eNode.previousSibling;
// 	}
// 	do {
// 		if (!eNode) break;
// 		if (eNode === sNode
// 			|| eNode.tagName === 'IMG'
// 			|| (eNode.nodeType===3 && eNode.data.trim() !== '')) {
// 			break;
// 		}
// 	} while( eNode = nextNode(eNode,'start') )

// 	if (eNode === sNode) {
// 		return eNode.nodeType === 1 ? eNode : eNode.parentNode;
// 	}

// 	// else return containerElement
// 	return this.containerElement();
// };

// /*
// range.prototype.expand = function() {
// 	// http://msdn.microsoft.com/en-us/library/ms536421%28VS.85%29.aspx
// 	this.oR.expand('word') // chrome
// };
// */
// range.prototype.walkChar = function(alter, point, direction) {
// 	var setEnd   = point === 'start' ? 'setStart' : 'setEnd',
// 		setStart = point === 'start' ? 'setEnd'   : 'setStart',
// //			strBefore = this.toCleanString(), strAfter,
// 		pos, coordBefore = this.endingCoord(point), coordAfter;
// 	do {
// 		pos = nextPosition(this.oR[point+'Container'], this.oR[point+'Offset'], direction );
// 		if (pos[0] === false) return this;
// 		this.oR[setEnd](pos[0],pos[1]);
// //			strAfter = this.toCleanString();
// 		coordAfter = this.endingCoord(point);
// 	} while( /*strAfter === strBefore ||*/ ( coordAfter.y === coordBefore.y && coordAfter.x === coordBefore.x ) ); // check if moved
// 	alter==='move' && this.oR[setStart](pos[0], pos[1]);
// 	this[setEnd](pos[0], pos[1]);
// 	return this;
// };





/////// NOT NEEDED?

// range.prototype.collapseToPoint = function(x, y) {
// 	// firefox has the rangeParent and rangeOffset properties of e.g. mouse-events

// 	/* todo: w3c test if its landed in browsers*/
// 	if (document.caretPositionFromPoint) {
//   		var point = document.caretPositionFromPoint(x,y);
//     	this.oR.setStart(point.offsetNode, point.offset);
//     	return this.setEnd(point.offsetNode, point.offset);
// 	} else if (document.caretRangeFromPoint) { // chrome (w3c deprecated)
// 		this.oR = document.caretRangeFromPoint(x,y);
// 		return this.setEnd(this.oR.endContainer, this.oR.endOffset);
// 	}

// 	var r = this.oR;
// 	var el = document.q1NodeFromPoint(x,y);
// 	if (el.nodeType!==3) {
// 		return this.setStart(el, 0).setEnd(el, 0);
// 	}
// 	r.setStart(el,0);
// 	r.setEnd(el,0);
// 	var rect = this.rect();
// 	while (rect.y+rect.h < y || rect.x < x) {
// 		if (r.startOffset-1 > el.data.length) break;
// 		r.setStart(r.startContainer, r.startOffset+1); // opera error!
// 		rect = this.rect();
// 	}
// 	return this.collapse(true); //.setStart(el,)collapse(true);
// };
/*
range.prototype.endingCoord = function(which) {
	var rects = this.oR.getClientRects(),
		rect = which === 'start' ? rects[0] : rects[rects.length-1];
	return which === 'start' ? {x:rect.left, y:rect.top} : {x:rect.right, y:rect.bottom};
};
*/



/*

older zzz?
    window.rangeExpandToStart = function(range) {
        var node = range.startContainer;
        while (node.previousSibling && node.previousSibling.data) {
            node = node.previousSibling;
        }
        //range.setStart(node,0);
        range.setEndBefore(node);
    };
    window.rangeExpandToEnd = function(range) {
        var node = range.endContainer;
        while (node.nextSibling && node.nextSibling.data) {
            node = node.nextSibling;
        }
        //range.setEnd(node,node.data.length);
        range.setEndAfter(node);
    };
    window.rangeExpandToElements = function(range) {
        rangeExpandToStart(range);
        rangeExpandToEnd(range);
    };
    window.rangeIsElement = function(range) {
        return range.toString() === range.commonAncestorContainer.textContent;
    };
    window.rangeGetNodes = function(r) {
        var start = r.startContainer;
        var end = r.endContainer;
        if (start === end) {
            var node = r.extractContents().firstChild;
            r.insertNode(node);
            return [node];
        }
        var els = [];

        walk(start);

        var sRange = document.createRange();
        sRange.setStart(r.startContainer,r.startOffset);
        sRange.setEndAfter(r.startContainer);
        var node = sRange.extractContents().firstChild;
        if (node.data) {
            sRange.insertNode(node);
            els.push(node);
        }
        sRange = document.createRange();
        sRange.setEnd(r.endContainer,r.endOffset);
        sRange.setStartBefore(r.endContainer);
        var node = sRange.extractContents().firstChild;
        if (node.data) {
            sRange.insertNode(node);
            els.push(node);
        }
        return els;

        function walk(el) {
            if (el !== end && !$.contains(el,end)) {
                el !== start && els.push(el);
                if (el.nextSibling) {
                    walk(el.nextSibling);
                } else { // walk next parant with a nextSibling
                    var parent = el.parentNode;
                    while (parent && !parent.nextSibling) {
                        parent = parent.parentNode;
                    }
                    walk(parent.nextSibling);
                }
            } else {
                el.firstChild && walk(el.firstChild);
            }
        }
    };
    window.rangeGetElements = function(r) {
        els = rangeGetNodes(r);
        for (var i = els.length, el; el = els[--i];) {
            if (el.data && el.data.toString().trim()) {
                var span = document.createElement('span');
                el.parentNode.insertBefore(span, el);
                span.appendChild(el);
                els[i] = span;
            }
        }
        return els;
    };
*/


