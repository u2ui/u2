import {SanitizePolicy, policyFor, sanitizeDefaults, sanitizePolicy} from '../policy.js';
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

// `style` survives: it is presentation, and removing it where it is unwanted is Unstyle's job.
test('sanitize policy: clean removes foreign attributes and rejected URLs', () => withFixture(`
    <a id=link class=kept style=color:red onclick=alert(1) href="javascript:alert(1)">link</a>
    <p id=paragraph title=kept data-note=removed>text</p>
`, root => {
    const link = root.querySelector('#link');
    const paragraph = root.querySelector('#paragraph');
    sanitizePolicy.clean(root);
    equal(link.outerHTML, '<a class="kept" style="color:red">link</a>');
    equal(paragraph.outerHTML, '<p title="kept">text</p>');
}));

test('sanitize policy: a policy that must not carry presentation narrows to its own attributes', () => withFixture(
    '<p style=color:red title=kept>text</p>', root => {
        const paragraph = root.firstElementChild;
        new SanitizePolicy({attributes: {'*': ['title']}}).clean(root);
        equal(paragraph.outerHTML, '<p title="kept">text</p>');
    }
));

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

test('sanitize policy: narrow drops the elements whose content is not content', () => {
    const policy = new SanitizePolicy();
    const root = document.createElement('div');
    root.innerHTML = '<style>p { color: red }</style><p>Text</p><nav>menu</nav>';
    const changed = policy.narrow(root);
    equal(root.innerHTML, '<p>Text</p>menu');
    equal(changed.length, 2);
});

// The input pipeline skips what the content model rejects, so structural repair can dissolve it with
// its line break intact. A stylesheet has no content to keep, and no later stage may be left with it.
test('sanitize policy: a dropped element goes before skip is asked', () => {
    const policy = new SanitizePolicy();
    const root = document.createElement('div');
    root.innerHTML = '<style>p { color: red }</style><nav>menu</nav>';
    policy.narrow(root, {skip: () => true});
    equal(root.innerHTML, '<nav>menu</nav>');
});

test('sanitize policy: a custom removeElements list replaces the default one', () => {
    const policy = new SanitizePolicy({elements: ['p'], removeElements: ['nav']});
    const root = document.createElement('div');
    root.innerHTML = '<nav>menu</nav><style>css</style><p>Text</p>';
    policy.narrow(root);
    equal(root.innerHTML, 'css<p>Text</p>');
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

// A host declares what its fields may carry; everything the application chose stays in place.
test('sanitize policy: policyFor layers a host declaration on the configured policy', () => {
    const base = new SanitizePolicy({elements: ['p', 'a'], attributes: {'*': ['class']}});
    same(policyFor({}, base), base, 'Nothing declared, nothing built');
    const host = policyFor({attributes: {'*': ['class', 'style']}}, base);
    same(policyFor({attributes: {'*': ['class', 'style']}}, base), host, 'Equal declarations share one policy');
    equal(host.elements, ['p', 'a'], 'What the application chose is kept');
    return withFixture('<p id=p class=x style=color:red title=t>text</p>', root => {
        const paragraph = root.firstElementChild;
        host.clean(root);
        equal(paragraph.outerHTML, '<p class="x" style="color:red">text</p>');
    });
});

// A host that names an element the shipped policy does not carry gets it: what may be inserted is
// the site's decision, and what may be stored is decided where the content is saved.
test('sanitize policy: a declared element list is the policy, not a narrowing of it', () => {
    const base = new SanitizePolicy({elements: ['p', 'strong']});
    const host = policyFor({elements: ['p', 'div']}, base);
    equal(host.elements, ['p', 'div']);
    const root = document.createElement('div');
    root.innerHTML = '<p>one</p><div>two</div><strong>three</strong>';
    host.narrow(root);
    equal(root.innerHTML, '<p>one</p><div>two</div>three');
});
