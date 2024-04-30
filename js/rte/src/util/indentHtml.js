
import {HTMLParser} from './htmlparser.js';

export function indent(str) {
	let res = '';
	let ind = '';
	let pre = false;
	str = str.replace(/\n|\t/g, ' ').replace(/<([\/a-zA-Z0-9]+)/g, function(a) { return a.toLowerCase(); });
	HTMLParser(str,{
		start(tag, attrs, unary) {
			pre = tag==='pre' ? true : pre;
			!pre && (res += ind);
			res += makeStartTag(tag,attrs,unary);
			!pre && (res+='\n');
			!unary && (ind += '\t');
		},
		end(tag) {
			pre = tag==='pre' ? false : pre;
			!pre && (ind=ind.substring(1));
			res += ind+'</' + tag.toLowerCase() + '>';
			!pre && (res+='\n');
		},
		chars(text) {
			!pre && (res += ind);
			if (!text.match(/^\s/)) text = '\uFEFF'+text; // mark if no whitespace
			if (!text.match(/\s$/)) text = text+'\uFEFF';
			res += text;
			!pre && (res+='\n');
		},
		comment(text) {
			res += "<!--" + text + "-->";
		}
	});
	return res;
};

function makeStartTag(tag, attrs, unary) {
    let str = '<' + tag;
    for (var i = 0, att; att = attrs[i++];) {
        str += ' ' + att.name + '="' + att.escaped + '"';
    }
    str += (unary?'/':'')+'>';
    return str;
};

export function unindent(str){
    return str.replace(/\s*\uFEFF\s*/g,'');
}
