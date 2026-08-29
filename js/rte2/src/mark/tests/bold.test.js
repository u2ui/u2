import {bold, boldHtml} from '../bold.js';
import {MarkAdapter} from '../dom-adapter.js';
import {MarkType} from '../mark.js';
import {equal, same, test, truthy, withFixture} from '../../../tests/harness.js';

test('bold mark: parses semantic aliases and renders canonical strong HTML', () => withFixture(
    '<strong>one</strong><b>two</b><span>three</span>', root => {
        same(boldHtml.type, bold);
        truthy(bold instanceof MarkType);
        truthy(boldHtml instanceof MarkAdapter);
        truthy(boldHtml.parse(root.children[0]).equals(bold.create()));
        truthy(boldHtml.parse(root.children[1]).equals(bold.create()));
        equal(boldHtml.parse(root.children[2]), null);
        equal(boldHtml.render(bold.create(), document).outerHTML, '<strong></strong>');
        truthy(boldHtml.clear(root.children[0], bold.create()));
    }
));
