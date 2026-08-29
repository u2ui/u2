import {MarkAdapter} from '../dom-adapter.js';
import {MarkType} from '../mark.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('mark adapter: validates its type and DOM policy', () => {
    const bold = new MarkType('bold');
    throws(() => new MarkAdapter(null, {selector: 'strong', tag: 'strong'}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: '', tag: 'strong'}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: 'strong'}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: 'strong', tag: 'STRONG'}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: 'strong', tag: 'strong', read: true}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: 'strong', tag: 'strong', write: true}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: 'strong', tag: 'strong', clear: true}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: 'strong', tag: 'strong', reuse: 'yes'}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: 'strong', tag: 'strong', reuse: true}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: 'strong', render: true}), TypeError);
    throws(() => new MarkAdapter(bold, {selector: 'strong', tag: 'strong', render: () => {}}), TypeError);
});

test('mark adapter: semantic aliases parse to one canonical element', () => withFixture(
    '<strong>one</strong><b>two</b><em>three</em>', root => {
        const bold = new MarkType('bold');
        const adapter = new MarkAdapter(bold, {selector: 'strong, b', tag: 'strong'});
        truthy(adapter.parse(root.children[0]).equals(bold.create()));
        truthy(adapter.parse(root.children[1]).equals(bold.create()));
        equal(adapter.parse(root.children[2]), null);
        equal(adapter.render(bold.create(), document).outerHTML, '<strong></strong>');
        same(adapter.type, bold);
        equal(adapter.selector, 'strong, b');
    }
));

test('mark adapter: values can describe class tokens', () => withFixture(
    '<span class=tone-red></span><span class=layout></span>', root => {
        const tone = new MarkType('tone');
        const adapter = new MarkAdapter(tone, {
            selector: 'span[class]',
            tag: 'span',
            read: element => [...element.classList]
                .find(name => name.startsWith('tone-'))?.slice(5),
            write: (element, value) => element.classList.add(`tone-${value}`),
            clear: (element, value) => element.classList.remove(`tone-${value}`),
            reuse: true,
        });
        equal(adapter.parse(root.children[0]).value, 'red');
        equal(adapter.parse(root.children[1]), null);
        equal(adapter.render(tone.create('blue'), document).outerHTML, '<span class="tone-blue"></span>');
        truthy(adapter.reusable);
        truthy(adapter.removable);
        const existing = root.children[0];
        adapter.apply(existing, tone.create('blue'));
        equal(existing.className, 'tone-red tone-blue');
        equal(adapter.clear(existing, tone.create('red')), false);
        equal(existing.className, 'tone-blue');
        adapter.clear(existing, tone.create('blue'));
        equal(existing.hasAttribute('class'), false);
        truthy(adapter.clear(document.createElement('span'), tone.create('blue')));
        equal(adapter.clear(document.createElement('b'), tone.create('blue')), false);
    }
));

test('mark adapter: values can describe HTML attributes', () => withFixture(
    '<a href=/docs title=Docs></a>', root => {
        const link = new MarkType('link');
        const adapter = new MarkAdapter(link, {
            selector: 'a[href]',
            tag: 'a',
            read: element => ({href: element.getAttribute('href'), title: element.title}),
            write(element, value) {
                element.href = value.href;
                if (value.title) element.title = value.title;
            },
        });
        equal(adapter.parse(root.firstElementChild).value, {href: '/docs', title: 'Docs'});
        const element = adapter.render(link.create({href: '/about', title: ''}), document);
        equal(element.getAttribute('href'), '/about');
        equal(element.hasAttribute('title'), false);
    }
));

test('mark adapter: values can describe style declarations', () => withFixture(
    '<span style="color: red"></span><span></span>', root => {
        const color = new MarkType('color');
        const adapter = new MarkAdapter(color, {
            selector: 'span[style]',
            tag: 'span',
            read: element => element.style.color || undefined,
            write: (element, value) => element.style.color = value,
        });
        equal(adapter.parse(root.firstElementChild).value, 'red');
        equal(adapter.parse(root.lastElementChild), null);
        equal(adapter.render(color.create('blue'), document).style.color, 'blue');
    }
));

test('mark adapter: custom rendering stays replaceable', () => {
    const mention = new MarkType('mention');
    const adapter = new MarkAdapter(mention, {
        selector: 'x-mention[data-id]',
        read: element => element.dataset.id,
        render(document, value) {
            const element = document.createElement('x-mention');
            element.dataset.id = value;
            return element;
        },
    });
    const element = adapter.render(mention.create('42'), document);
    equal(element.outerHTML, '<x-mention data-id="42"></x-mention>');
    equal(adapter.parse(element).value, '42');
});

test('mark adapter: parsing and rendering reject foreign shapes', () => {
    const bold = new MarkType('bold');
    const adapter = new MarkAdapter(bold, {selector: 'strong', tag: 'strong'});
    throws(() => adapter.parse(document.createTextNode('text')), TypeError);
    throws(() => adapter.render(new MarkType('bold').create(), document), TypeError);
    throws(() => adapter.apply(document.createElement('strong'), bold.create()), TypeError);
    throws(() => adapter.clear(document.createElement('strong'), bold.create()), TypeError);
    throws(() => adapter.render(bold.create(), null), TypeError);
    const attached = new MarkAdapter(bold, {
        selector: 'strong',
        render(document) {
            const parent = document.createElement('div');
            return parent.appendChild(document.createElement('strong'));
        },
    });
    throws(() => attached.render(bold.create(), document), TypeError);
    const filled = new MarkAdapter(bold, {
        selector: 'strong',
        render(document) {
            const element = document.createElement('strong');
            element.textContent = 'content';
            return element;
        },
    });
    throws(() => filled.render(bold.create(), document), TypeError);
});
