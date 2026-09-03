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
        // An image executes nothing, an SVG one included: browsers draw it in a
        // script-free context. A navigating attribute is a page, and keeps out.
        truthy(sanitizePolicy.allowsUrl(image, 'src', 'data:image/png;base64,x'));
        truthy(sanitizePolicy.allowsUrl(image, 'src', 'data:image/svg+xml;utf8,%3Csvg%3E%3C/svg%3E'));
        equal(sanitizePolicy.allowsUrl(image, 'src', 'javascript:alert(1)'), false);
        equal(sanitizePolicy.allowsUrl(link, 'href', 'data:text/html,%3Cscript%3E'), false);
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

test('sanitize policy: clean narrows classes to the declared content names', () => {
    const policy = new SanitizePolicy();
    const root = document.createElement('div');
    root.innerHTML = '<p class="lead foreign">a</p><p class="foreign">b</p><p class="lead">c</p>';
    policy.clean(root, {classes: ['lead']});
    equal(root.innerHTML, '<p class="lead">a</p><p>b</p><p class="lead">c</p>');
});

test('sanitize policy: clean leaves classes alone when none are declared', () => {
    const policy = new SanitizePolicy();
    const root = document.createElement('div');
    root.innerHTML = '<p class="anything else">a</p>';
    policy.clean(root);
    equal(root.innerHTML, '<p class="anything else">a</p>');
});

test('sanitize policy: narrow reduces a subtree to the allowed elements', () => {
    const policy = new SanitizePolicy();
    const root = document.createElement('div');
    root.innerHTML = '<section><h2>Title</h2><nav>menu</nav></section>';
    const changed = policy.narrow(root, {elements: ['h2', 'p']});
    equal(root.innerHTML, '<h2>Title</h2>menu');
    equal(changed.length, 2);
});

test('sanitize policy: narrow never widens past the policy itself', () => {
    const policy = new SanitizePolicy({elements: ['p']});
    const root = document.createElement('div');
    root.innerHTML = '<h2>Title</h2><p>Text</p>';
    policy.narrow(root, {elements: ['p', 'h2']});
    equal(root.innerHTML, 'Title<p>Text</p>');
});

test('sanitize policy: narrow keeps meaning through an alias and skips on request', () => {
    const policy = new SanitizePolicy();
    const root = document.createElement('div');
    root.innerHTML = '<b class=x>bold</b><i>italic</i><nav>menu</nav>';
    policy.narrow(root, {
        elements: ['strong', 'em', 'nav'],
        alias: {b: 'strong', i: 'em'},
        skip: element => element.localName === 'nav',
    });
    equal(root.innerHTML, '<strong class="x">bold</strong><em>italic</em><nav>menu</nav>');
});

test('sanitize policy: an alias outside the allowed elements falls back to unwrapping', () => {
    const policy = new SanitizePolicy();
    const root = document.createElement('div');
    root.innerHTML = '<b>bold</b>';
    policy.narrow(root, {elements: ['p'], alias: {b: 'strong'}});
    equal(root.innerHTML, 'bold');
});
