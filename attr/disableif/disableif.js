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
        el.disabled = conditionMet;
    }
}


new SelectorObserver({
    on: (el) => {
        checkCondition(el);
        // wait for custom-element-inputs
        // queueMicrotask(()=>checkCondition(el));
        requestAnimationFrame(()=>checkCondition(el));
        //setTimeout(()=>checkCondition(el));
        const form = el.form;
        el.form.addEventListener('input', () => checkCondition(el));
    },
    off: (el) => {
    }
}).observe('[u2-disableif]');
