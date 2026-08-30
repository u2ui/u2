import {SanitizePolicy, sanitizeDefaults, sanitizePolicy} from '../policy.js';
import {equal, same, test, throws, truthy, withFixture} from '../../../tests/harness.js';

test('sanitize policy: default policy is immutable and covers document elements', () => {
    equal(sanitizePolicy.elements, sanitizeDefaults.elements);
    truthy(sanitizePolicy.elements.includes('p'));
    truthy(sanitizePolicy.elements.includes('table'));
    truthy(Object.isFrozen(sanitizePolicy));
    truthy(Object.isFrozen(sanitizePolicy.elements));
    truthy(Object.isFrozen(sanitizePolicy.attributeNames));
});

test('sanitize policy: custom names are normalized, deduplicated, and isolated', () => {
    const elements = ['P', 'a', 'p'];
    const attributes = {'*': ['TITLE'], a: ['href', 'title']};
    const policy = new SanitizePolicy({elements, attributes, protocols: {a: {href: ['HTTPS', 'relative']}}});
    elements.push('script');
    attributes.a.push('onclick');
    equal(policy.elements, ['p', 'a']);
    equal(policy.attributeNames, ['title', 'href']);
});

test('sanitize policy: URL protocols are explicit and robust against whitespace', () => withFixture(
    '<a id=link></a><img id=image>', root => {
        const link = root.querySelector('#link');
        const image = root.querySelector('#image');
        truthy(sanitizePolicy.allowsUrl(link, 'href', '/relative'));
        truthy(sanitizePolicy.allowsUrl(link, 'href', 'mailto:test@example.com'));
        equal(sanitizePolicy.allowsUrl(link, 'href', 'java\nscript:alert(1)'), false);
        equal(sanitizePolicy.allowsUrl(image, 'src', 'data:image/png;base64,x'), false);
        equal(sanitizePolicy.allowsUrl(link, 'action', '/submit'), false, 'URL attributes need a matching rule');
    }
));

test('sanitize policy: clean removes foreign attributes and rejected URLs', () => withFixture(`
    <a id=link class=kept style=color:red onclick=alert(1) href="javascript:alert(1)">link</a>
    <p id=paragraph title=kept data-note=removed>text</p>
`, root => {
    const link = root.querySelector('#link');
    const paragraph = root.querySelector('#paragraph');
    sanitizePolicy.clean(root);
    equal(link.outerHTML, '<a class="kept">link</a>');
    equal(paragraph.outerHTML, '<p title="kept">text</p>');
}));

test('sanitize policy: clean includes an element root and optional data attributes', () => withFixture(
    '<p data-note=kept unknown=removed>text</p>', root => {
        const policy = new SanitizePolicy({elements: ['p'], dataAttributes: true});
        const paragraph = root.firstElementChild;
        same(policy.clean(paragraph), paragraph);
        equal(paragraph.outerHTML, '<p data-note="kept">text</p>');
    }
));

test('sanitize policy: malformed policies fail closed during construction', () => {
    throws(() => new SanitizePolicy({elements: 'p'}), TypeError);
    throws(() => new SanitizePolicy({elements: ['p script']}), TypeError);
    throws(() => new SanitizePolicy({attributes: []}), TypeError);
    throws(() => new SanitizePolicy({protocols: {a: {href: ['java script']}}}), TypeError);
    throws(() => new SanitizePolicy({comments: 'false'}), TypeError);
});
