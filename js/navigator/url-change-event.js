
let activeUrl = location.href;

let oldPush = history.pushState;
let oldReplace = history.replaceState;
history.pushState = function (...args) {
    oldPush.apply(this, args);
    trigger(location.href);
};
history.replaceState = function (...args) {
    oldReplace.apply(this, args);
    trigger(location.href);
};

function trigger(url) {
    if (activeUrl === url) return;

    const baseUrl = url.replace(/#.*$/, '');
    const activeBaseUrl = activeUrl.replace(/#.*$/, '');
    const sameDocument = baseUrl === activeBaseUrl;

    activeUrl = url;

    const event = new CustomEvent('u2-url-change',{bubbles:false, cancelable:false, detail: {url, sameDocument}});
    window.dispatchEvent(event);
}

addEventListener("popstate", () => trigger(location.href));
addEventListener("hashchange", () => trigger(location.href));
