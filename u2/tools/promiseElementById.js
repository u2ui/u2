
export const promiseElementById = function(id) {
    let { promise, resolve } = Promise.withResolvers();
    const weakRef = new WeakRef(resolve);
    const check = () => {
        const resolve = weakRef.deref();
        if (!resolve) return;
        //console.log('wait for element');
        const element = document.getElementById(id);
        element ? resolve(element) : requestAnimationFrame(check);
    };
    check();
    return promise;
}
