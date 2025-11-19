
import {HTMLParser} from './htmlparser.js';

export function indent(str) {
	let result = '';
	let indent = '';
	let pre = false;
	str = str.replace(/\n|\t/g, ' ').replace(/<([\/a-zA-Z0-9]+)/g, function(a) { return a.toLowerCase(); });
	HTMLParser(str,{
		start(tag, attrs, unary) {
			pre = tag==='pre' ? true : pre;
			!pre && (result += indent);
			result += makeStartTag(tag,attrs,unary);
			!pre && (result+='\n');
			!unary && (indent += '\t');
		},
		end(tag) {
			pre = tag==='pre' ? false : pre;
			!pre && (indent=indent.substring(1));
			result += indent+'</' + tag.toLowerCase() + '>';
			!pre && (result+='\n');
		},
		chars(text) {
			if (!pre && !text.trim()) return; // Wenn Text nur aus Leerzeichen besteht, ignorieren wir ihn komplett.
			// if (!pre && !text.trim()) {
			// 	result = result.endsWith('\n') ? result.slice(0, -1) + ' \n' : result + ' ';
			// 	return;
			// }

			!pre && (result += indent);
			if (!text.match(/^\s/)) text = '\uFEFF'+text; // mark if no whitespace
			if (!text.match(/\s$/)) text = text+'\uFEFF';
			result += text;
			!pre && (result+='\n');
		},
		comment(text) {
			result += "<!--" + text + "-->";
		}
	});
	return result;
};

function makeStartTag(tag, attrs, unary) {
    let str = '<' + tag;
    for (const att of attrs) {
        str += ' ' + att.name + '="' + att.escaped + '"';
    }
    str += (unary?'/':'')+'>';
    return str;
};

export function unindent(str){
    return str.replace(/\s*\uFEFF\s*/g,'');
}
