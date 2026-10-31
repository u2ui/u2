import {NativeSanitizer} from '../native.js';
import {SanitizePolicy} from '../policy.js';
import {equal, same, test, throws, truthy} from '../../../tests/harness.js';

test('native sanitizer: support detection follows the supplied document', () => {
    equal(NativeSanitizer.supported({createElement: () => ({})}), false);
    equal(NativeSanitizer.supported({createElement: () => ({setHTML() {}})}), true);
});

test('native sanitizer: construction requires the policy contract', () => {
    throws(() => new NativeSanitizer({}), TypeError);
});

test('native sanitizer: narrows elements and filters the detached result', () => {
    const policy = new SanitizePolicy({
        elements: ['p', 'a', 'em'],
        attributes: {'*': ['class'], a: ['href']},
        protocols: {a: {href: ['https']}},
    });
    const fragment = document.createDocumentFragment();
    const link = document.createElement('a');
    link.setAttribute('class', 'kept');
    link.setAttribute('href', 'javascript:alert(1)');
    link.append(document.createElement('em'), 'text');
    fragment.append(link);
    let call;
    const fakeDocument = {
        baseURI: document.baseURI,
        createElement() {
            return {
                content: fragment,
                setHTML(html, options) { call = {html, options}; },
            };
        },
    };
    const result = new NativeSanitizer(policy).sanitize('<p>input</p>', {
        document: fakeDocument,
        elements: ['p', 'a', 'aside'],
    });
    same(result, fragment);
    equal(call.html, '<p>input</p>');
    equal(call.options.sanitizer, {
        removeElements: policy.removeElements,
        attributes: ['class', 'href'],
        comments: false,
        dataAttributes: false,
    });
    equal(link.outerHTML, '<a class="kept">text</a>');
});

test('native sanitizer: an unavailable safe sink fails explicitly', () => {
    const error = throws(
        () => new NativeSanitizer().sanitize('<p>text</p>', {document: {createElement: () => ({})}}),
        DOMException,
    );
    equal(error.name, 'NotSupportedError');
});

test('native sanitizer: an element outside the policy keeps its content', () => {
    if (!NativeSanitizer.supported(document)) return;
    const policy = new SanitizePolicy({elements: ['p']});
    const fragment = new NativeSanitizer(policy).sanitize('<p>a <small>b</small> <x-y>c</x-y><style>d</style></p>');
    equal(fragment.firstElementChild.outerHTML, '<p>a b c</p>');
});

test('native sanitizer: the browser safe sink rejects active content when available', () => {
    if (!NativeSanitizer.supported(document)) return;
    const fragment = new NativeSanitizer().sanitize(`
        <p onclick="alert(1)">safe</p>
        <a href="javascript:alert(1)">link</a>
        <script>alert(1)</script>
    `);
    equal(fragment.querySelector('script'), null);
    equal(fragment.querySelector('p').getAttribute('onclick'), null);
    equal(fragment.querySelector('a').getAttribute('href'), null);
    truthy(fragment.textContent.includes('safe'));
});
