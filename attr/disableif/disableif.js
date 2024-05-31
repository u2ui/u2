import { SelectorObserver } from '../../js/SelectorObserver/SelectorObserver.js';

function checkCondition(el) {
    const condition = el.getAttribute('u2-disableif');

    const match = condition.match(/^(!?)([^=!<>]*)(=|!=|>|<)?([^=!<>]*)$/);
    if (match) {
        let [_, not, field, operator, value] = match;
        if (not) {
            if (operator) console.warn(`u2-disableif: "!" operator is not supported with other operators`, { el, field, operator, value });
            operator = '=';
        }
        const target = el.form.elements[field];
        if (!target) {
            console.warn(`u2-disableif: field "${field}" not found`, { el, field, operator, value });
            return;
        }
        let stringTargetValue = target.value;
        if (target.type === 'checkbox') stringTargetValue = target.checked ? target.value : '';

        const numericTargetValue = parseFloat(stringTargetValue);
        const numericConditionValue = parseFloat(value);

        let conditionMet = false;
        switch (operator) {
            case undefined:
                conditionMet = !!stringTargetValue;
                break;
            case '=':
                conditionMet = stringTargetValue === value;
                break;
            case '!=':
                conditionMet = stringTargetValue !== value;
                break;
            case '>':
                conditionMet = numericTargetValue > numericConditionValue;
                break;
            case '<':
                conditionMet = numericTargetValue < numericConditionValue;
                break;
        }
        el.disabled = conditionMet
    }
}


new SelectorObserver({
    on: (el) => {
        checkCondition(el);
        const field = el.getAttribute('u2-disableif').match(/(\w+)/)[1];
        el.form.elements[field].addEventListener('input', () => checkCondition(el));
    },
    off: (el) => {
        const field = el.getAttribute('u2-disableif').match(/(\w+)/)[1];
        el.form.elements[field].removeEventListener('input', () => checkCondition(el));
    }
}).observe('[u2-disableif]');


