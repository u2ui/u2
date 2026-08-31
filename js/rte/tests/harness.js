const tests = [];

export function test(name, run) {
    tests.push({name, run});
}

export function truthy(value, message = 'Expected a truthy value') {
    if (!value) throw new Error(`${message}; received ${show(value)}`);
}

export function equal(actual, expected, message = 'Values differ') {
    if (Object.is(actual, expected)) return;
    if (serial(actual) === serial(expected)) return;
    throw new Error(`${message}; expected ${show(expected)}, received ${show(actual)}`);
}

export function same(actual, expected, message = 'Values are not identical') {
    if (actual !== expected) throw new Error(message);
}

export function throws(run, ErrorType = Error, message) {
    try {
        run();
    } catch (error) {
        if (error instanceof ErrorType) return error;
        throw new Error(`Expected ${ErrorType.name}, received ${error.constructor.name}`);
    }
    throw new Error(message || `Expected ${ErrorType.name} to be thrown`);
}

export function withFixture(html, run) {
    const root = document.createElement('section');
    root.dataset.rteFixture = '';
    root.innerHTML = html;
    document.body.append(root);
    const done = () => {
        if (root.contains(document.activeElement)) document.activeElement.blur();
        getSelection().removeAllRanges();
        root.remove();
    };
    try {
        const result = run(root);
        return result?.then ? result.finally(done) : (done(), result);
    } catch (error) {
        done();
        throw error;
    }
}

export async function run(output) {
    let passed = 0;
    const failures = [];
    for (const item of tests) {
        const line = document.createElement('li');
        try {
            await item.run();
            passed++;
            line.dataset.result = 'passed';
            line.textContent = `PASS ${item.name}`;
        } catch (error) {
            failures.push({name: item.name, error});
            line.dataset.result = 'failed';
            line.textContent = `FAIL ${item.name}: ${error.stack || error}`;
            console.error(item.name, error);
        }
        output?.append(line);
    }
    const result = {passed, failed: failures.length, total: tests.length, failures};
    document.documentElement.dataset.result = failures.length ? 'failed' : 'passed';
    globalThis.__rteTests = result;
    return result;
}

function serial(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return null;
    }
}

function show(value) {
    return typeof value === 'string' ? JSON.stringify(value) : serial(value) ?? String(value);
}
