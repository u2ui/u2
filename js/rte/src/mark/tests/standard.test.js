import {
    bold,
    boldHtml,
    code,
    codeHtml,
    italic,
    italicHtml,
    link,
    linkHtml,
    strike,
    strikeHtml,
    underline,
    underlineHtml,
} from '../standard.js';
import {applyMark} from '../../command/mark.js';
import {Commands} from '../../command/commands.js';
import {Rte} from '../../core/core.js';
import {MarkAdapter} from '../dom-adapter.js';
import {MarkType} from '../mark.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('standard marks: semantic aliases parse and render canonical HTML', () => withFixture(`
    <b>bold</b><i>italic</i><u>underline</u><strike>strike</strike><code>code</code>
`, root => {
    const cases = [
        [bold, boldHtml, root.children[0], '<strong></strong>'],
        [italic, italicHtml, root.children[1], '<em></em>'],
        [underline, underlineHtml, root.children[2], '<u></u>'],
        [strike, strikeHtml, root.children[3], '<s></s>'],
        [code, codeHtml, root.children[4], '<code></code>'],
    ];
    for (const [type, adapter, source, html] of cases) {
        truthy(type instanceof MarkType);
        truthy(adapter instanceof MarkAdapter);
        same(adapter.type, type);
        truthy(adapter.parse(source).equals(type.create()));
        equal(adapter.render(type.create(), document).outerHTML, html);
        truthy(adapter.clear(source, type.create()));
    }
    truthy(boldHtml.parse(document.createElement('strong')).equals(bold.create()));
    truthy(italicHtml.parse(document.createElement('em')).equals(italic.create()));
    truthy(strikeHtml.parse(document.createElement('s')).equals(strike.create()));
}));

test('standard marks: links use one explicit serializable value contract', () => withFixture(`
    <a href="/docs" target="_blank" rel="help" title="Docs" data-id="1">docs</a><a>anchor</a>
`, root => {
    const value = {href: '/docs', target: '_blank', rel: 'help', title: 'Docs'};
    same(linkHtml.type, link);
    truthy(linkHtml.parse(root.children[0]).equals(link.create(value)));
    equal(linkHtml.parse(root.children[1]), null);
    equal(linkHtml.render(link.create(value), document).outerHTML,
        '<a href="/docs" target="_blank" rel="help" title="Docs"></a>');
    truthy(linkHtml.clear(root.children[0], link.create(value)));
    for (const invalid of [null, '/docs', {}, {href: 1}, {href: '/docs', target: true}, {href: '/docs', ping: '/log'}]) {
        throws(() => linkHtml.render(link.create(invalid), document), TypeError);
    }
}));

test('standard marks: replacing a partial link preserves attributes without nesting anchors', () => withFixture(
    '<div contenteditable><p><a href="/old" class="keep">hello</a> world</p></div>', root => {
        const core = new Rte(document, {auto: false});
        const host = root.firstElementChild;
        const commands = new Commands(core.add(host), {commands: {
            link: applyMark(linkHtml, {href: '/new', target: '_blank'}),
        }});
        try {
            const text = host.querySelector('a').firstChild;
            getSelection().setBaseAndExtent(text, 1, text, 4);
            commands.run('link');
            equal(host.innerHTML, '<p><a href="/old" class="keep">h</a><span class="keep"><a href="/new" target="_blank">ell</a></span><a href="/old" class="keep">o</a> world</p>');
            equal(host.querySelectorAll('a a').length, 0);
            equal(getSelection().toString(), 'ell');
        } finally {
            core.dispose();
        }
    }
));
