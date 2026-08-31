import {NativeSanitizer} from '../../sanitize/native.js';
import {Rte} from '../../core/core.js';
import {Source} from '../source.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('source: validates its surface and options', () => withSource('<div contenteditable><p>one</p></div>', ({surface}) => {
    throws(() => new Source(null), TypeError);
    throws(() => new Source(surface, {sanitizer: {}}), TypeError);
    throws(() => new Source(surface, {indent: 'x'}), TypeError);
    truthy(new Source(surface, {indent: '\t'}));
}));

test('source: one block per line where every sibling is a block', () => withSource(
    '<div contenteditable><p>one</p><ul><li>a</li><li>b</li></ul></div>', ({source}) => {
        equal(source.read().html, [
            '<p>one</p>',
            '<ul>',
            '    <li>a</li>',
            '    <li>b</li>',
            '</ul>',
        ].join('\n'));
    }
));

test('source: inline content stays on its own line', () => withSource(
    '<div contenteditable><p>one <strong>two</strong> three<br>four</p></div>', ({source}) => {
        equal(source.read().html, '<p>one <strong>two</strong> three<br>four</p>');
    }
));

test('source: mixed children are never broken apart', () => withSource(
    '<div contenteditable><li>text<ul><li>a</li></ul></li></div>', ({source}) => {
        equal(source.read().html, '<li>text<ul>\n        <li>a</li>\n    </ul></li>');
    }
));

test('source: text, attributes, comments, and void elements are serialized', () => withSource(
    '<div contenteditable></div>', ({source, host}) => {
        host.innerHTML = '<p class="x" title="a &amp; &quot;b&quot;">1 &lt; 2 &amp; 3<img src="y.png"></p>';
        host.append(document.createComment(' note '));
        equal(source.read().html, [
            '<p class="x" title="a &amp; &quot;b&quot;">1 &lt; 2 &amp; 3<img src="y.png"></p>',
            '<!-- note -->',
        ].join('\n'));
    }
));

test('source: a caret reports its offset in the serialized text', () => withSource(
    '<div contenteditable><p>one</p><p>two</p></div>', ({source, host}) => {
        getSelection().collapse(host.lastElementChild.firstChild, 1);
        const {html, start, end} = source.read();
        equal(html, '<p>one</p>\n<p>two</p>');
        equal(html.slice(0, start), '<p>one</p>\n<p>t');
        equal(start, end);
    }
));

test('source: a selection reports both offsets across escaped text', () => withSource(
    '<div contenteditable><p>a &amp; b</p></div>', ({source, host}) => {
        const text = host.firstElementChild.firstChild;
        getSelection().setBaseAndExtent(text, 2, text, 5);
        const {html, start, end} = source.read();
        equal(html.slice(start, end), '&amp; b', 'The offset accounts for escaping');
    }
));

test('source: an element boundary reports an offset too', () => withSource(
    '<div contenteditable><p>one</p><p>two</p></div>', ({source, host}) => {
        getSelection().collapse(host, 1);
        const {html, start} = source.read();
        equal(html.slice(0, start).trimEnd(), '<p>one</p>');
    }
));

test('source: no selection reports no offsets', () => withSource(
    '<div contenteditable><p>one</p></div>', ({source}) => {
        getSelection().removeAllRanges();
        const {start, end} = source.read();
        equal(start, null);
        equal(end, null);
    }
));

test('source: writing replaces the content and reports its nodes', () => withSource(
    '<div contenteditable><p>one</p></div>', ({source, host}) => {
        const nodes = source.write('<h2>title</h2>\n<p>body</p>');
        equal(host.innerHTML, '<h2>title</h2><p>body</p>', 'The added breaks do not come back as text');
        equal(nodes.map(node => node.localName), ['h2', 'p']);
        equal(getSelection().focusNode, host);
        equal(getSelection().focusOffset, 0);
    }
));

test('source: retained top-layer UI is neither serialized nor replaced', () => withSource(
    '<div contenteditable><p>one</p></div>', ({core, source, host}) => {
        const ui = document.createElement('div');
        ui.contentEditable = 'false';
        core.retain(ui);
        host.append(ui);
        equal(source.read().html, '<p>one</p>');
        source.write('<p>two</p>');
        equal(source.read().html, '<p>two</p>');
        same(ui.parentNode, host);
        same(host.lastChild, ui);
    }
));

test('source: writing rejects anything but a string', () => withSource(
    '<div contenteditable><p>one</p></div>', ({source}) => {
        throws(() => source.write(null), TypeError);
        throws(() => source.write(document.createElement('p')), TypeError);
    }
));

test('source: reading and writing the same text is a round trip', () => withSource(
    '<div contenteditable><p>one <em>two</em></p><ul><li>a</li><li>b</li></ul><hr></div>', ({source, host}) => {
        const before = host.innerHTML;
        const {html} = source.read();
        source.write(html);
        equal(host.innerHTML, before);
    }
));

test('source: writing sanitizes and narrows to the host elements', () => withSource(
    '<div contenteditable style="--u2-rte-elements: p"><p>one</p></div>', ({source, host}) => {
        source.write('<p onclick="alert(1)">safe</p><script>alert(2)<\/script><h2>heading</h2>');
        equal(host.querySelectorAll('script').length, 0, 'Scripts never survive the sanitizer');
        equal(host.querySelector('p').hasAttribute('onclick'), false);
        equal(host.querySelectorAll('h2').length, 0, 'The host allows only its configured elements');
        truthy(host.textContent.includes('safe'));
    }
));

test('source: writing narrows classes to the host declaration', () => withSource(
    '<div contenteditable style="--u2-rte-classes: lead"><p>one</p></div>', ({source, host}) => {
        source.write('<p class="lead foreign">a</p>');
        equal(host.innerHTML, '<p class="lead">a</p>');
    }
));

test('source: writing is one transaction on the surface', () => withSource(
    '<div contenteditable><p>one</p></div>', ({source, surface}) => {
        const seen = [];
        surface.addEventListener('u2-rte-change', event => seen.push(event.detail.transaction.options));
        source.write('<p>two</p>');
        equal(seen.length, 1);
        equal(seen[0].command, 'source');
    }
));

function withSource(html, run) {
    return withFixture(html, root => {
        if (!NativeSanitizer.supported()) return;
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        try {
            const surface = core.add(host);
            return run({core, host, source: new Source(surface), surface});
        } finally {
            core.dispose();
        }
    });
}
