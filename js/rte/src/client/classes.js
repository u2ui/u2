import {classMark} from '../mark/standard.js';
import {valueMark} from '../command/mark.js';

// Optional content-class control. The choices come from the host's `--u2-rte-classes`, so one
// declaration decides what the control offers, what the sanitizer keeps, and what presentation
// cleanup leaves alone.
//
// One set of classes is one mark type and therefore mutually exclusive. A field that combines axes —
// a colour *and* an alignment — names them in `--u2-rte-class-groups`, and each named set becomes a
// section of the same menu: exclusive in itself, free of the others. The menu is one control whose
// content is read per surface, so how many sets a field has stays a question CSS answers.
export function classStyles({label = 'Style', name = 'style', command = 'classStyle', text = 'A'} = {}) {
    for (const value of [label, name, command, text]) {
        if (typeof value !== 'string' || !value.trim()) throw new TypeError('A class control needs names');
    }
    const adapters = new Map();
    return Object.freeze({
        name: 'classes',
        commands: ({surface}) => ({[command]: styleCommand(adapters, surface)}),
        toolbar: Object.freeze([Object.freeze({type: 'menu', name, command, label, text, groups: sets})]),
    });
}

export const classes = classStyles();

// What the host offers, in the order it declared it: `Lead Caption, color(Red Green)` puts the two
// loose ones on top and the named set below them. `--u2-rte-classes` says what may *exist* — a class
// foreign content carries needs no control — so it is only fallen back on where nothing is offered.
function sets(surface) {
    const {classes, classGroups} = surface.config;
    const offered = Object.entries(classGroups ?? {}).map(([key, values]) => ({label: key === '*' ? '' : key, values}));
    if (offered.length) return offered;
    return classes.length ? [{label: '', values: classes}] : [];
}

// One adapter per set, so the same host keeps one mark identity across refreshes and two hosts with
// the same classes share it.
function styleCommand(adapters, surface) {
    const resolve = values => {
        if (!values?.length) return null;
        const key = values.join(' ');
        if (!adapters.has(key)) adapters.set(key, valueMark(classMark(values)));
        return adapters.get(key);
    };
    // Which set a value belongs to decides which mark answers for it — the sets are independent, and
    // a class the host does not declare belongs to none, so it is simply unavailable.
    const setOf = value => sets(surface).find(set => set.values.includes(value))?.values;
    const of = edit => resolve(edit.value == null ? sets(surface)[0]?.values : setOf(edit.value));
    const set = edit => edit.value != null && of(edit)?.state(edit) === edit.value;
    return {
        // What is already set stays available: picking it again is how a set is emptied, and a set
        // carrying nothing is a normal state — no colour is as valid as red.
        enabled: edit => !!of(edit) && (set(edit) || of(edit).enabled(edit)),
        state: edit => of(edit)?.state(edit) ?? null,
        run: edit => of(edit)?.run(set(edit) ? edit.with({value: null}) : edit),
    };
}
