import {RepairExecutor} from '../execute/repair-executor.js';
import {RepairPlanner} from '../repair/repair-planner.js';
import {PointMap} from '../../selection/map/point-map.js';
import {isEditingBoundary} from '../../selection/ownership/ownership.js';

const PASSIVE = new Set(['keep', 'boundary', 'reject']);

export class Normalizer {
    #root;
    #planner;
    #limit;

    constructor(root, options = {}) {
        const {planner = null, limit = 10000, ...policy} = options;
        if (root?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('A normalizer requires an element root');
        if (planner !== null && (typeof planner?.plan !== 'function' || planner.root !== root)) {
            throw new TypeError('A custom repair planner must belong to the normalizer root');
        }
        if (!Number.isInteger(limit) || limit < 1) throw new RangeError('Normalization limit must be a positive integer');
        this.#root = root;
        this.#planner = planner || new RepairPlanner(root, policy);
        this.#limit = limit;
    }

    get root() { return this.#root; }
    get planner() { return this.#planner; }
    get limit() { return this.#limit; }

    normalize(options) {
        return this.#run(options, false);
    }

    step(options) {
        return this.#run(options, true);
    }

    #run({scope = this.#root, points = [], transaction = null} = {}, single) {
        if (scope?.nodeType !== Node.ELEMENT_NODE || scope !== this.#root && !this.#root.contains(scope)) {
            throw new RangeError('Normalization scope must be an element inside the root');
        }
        if (scope !== this.#root && isEditingBoundary(scope)) {
            throw new RangeError('Normalization scope cannot cross into a nested editing boundary');
        }
        const map = new PointMap(points);
        const executor = new RepairExecutor(this.#root, {map, transaction});
        const actions = [];
        const issues = new Map();
        let passes = 0;
        let stable = false;
        outer: while (true) {
            let changed = false;
            passes++;
            // The walk just collected these, so only a repair in this same pass
            // can have detached one. Until that happens the check is a tree walk
            // per element for nothing.
            const collected = actions.length;
            for (const parent of parents(scope, this.#planner.model)) {
                if (actions.length !== collected && parent !== this.#root && !this.#root.contains(parent)) continue;
                const result = this.#normalizeParent(parent, executor, actions, issues, single);
                if (result.changed) changed = true;
                if (result.stopped) break outer;
            }
            if (!changed) {
                stable = true;
                break;
            }
        }
        const unresolved = [...issues.values()].filter(issue => this.#root.contains(issue.node));
        return Object.freeze({
            changed: actions.length > 0,
            stable,
            passes,
            actions: Object.freeze(actions),
            issues: Object.freeze(unresolved),
            map,
        });
    }

    #normalizeParent(parent, executor, actions, issues, single) {
        let changed = false;
        for (let child = parent.firstChild; child;) {
            const plan = this.#planner.plan(parent, child);
            if (plan.type === 'reject') issues.set(child, Object.freeze({node: child, parent, plan}));
            else if (issues.size) issues.delete(child);
            // Most children need nothing. Asking the executor to confirm that
            // would re-validate the parent against the root for every one of
            // them, which is a tree walk per node in an unchanged document.
            if (PASSIVE.has(plan.type)) {
                child = child.nextSibling;
                continue;
            }
            if (plan.type === 'wrap') {
                const nodes = [child];
                let next = child.nextSibling;
                while (next && !this.#planner.model.block(child)) {
                    const nextPlan = this.#planner.plan(parent, next);
                    if (nextPlan.type !== 'wrap' || nextPlan.tag !== plan.tag || this.#planner.model.block(next)) break;
                    nodes.push(next);
                    next = next.nextSibling;
                }
                this.#assertLimit(actions);
                const wrapper = executor.wrap(nodes, plan.tag);
                actions.push(record(plan, parent, wrapper, {count: nodes.length}));
                changed = true;
                if (single) return {changed, stopped: true};
                child = next;
            } else {
                const next = child.nextSibling;
                this.#assertLimit(actions);
                if (executor.apply(plan, parent, child)) {
                    actions.push(record(plan, parent, child));
                    changed = true;
                    if (single) return {changed, stopped: true};
                    child = next?.parentNode === parent ? next : null;
                } else {
                    child = next;
                }
            }
        }
        return {changed, stopped: false};
    }

    #assertLimit(actions) {
        if (actions.length >= this.#limit) throw new RangeError('Normalization did not converge within its operation limit');
    }
}

function parents(scope, model) {
    const result = [];
    const visit = element => {
        if (element !== scope && (isEditingBoundary(element) || model.atomic(element))) return;
        for (const child of element.children) visit(child);
        result.push(element);
    };
    visit(scope);
    return result;
}

function record(plan, parent, node, detail = {}) {
    return Object.freeze({type: plan.type, parent, node, ...detail, ...plan});
}
