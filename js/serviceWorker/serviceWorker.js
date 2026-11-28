// central registration - call only once
export async function register(options = {}) {
    if (!('serviceWorker' in navigator)) return null;

    try {
        // wait for the load event
        if (document.readyState !== 'complete') {
            console.log('not "load" yet, wait for register')
            await new Promise(resolve => addEventListener('load', resolve, { once: true }));
        }

        const registration = await navigator.serviceWorker.register('../sw.js', { // '.. ???? in the same directory'
            scope: options.scope || '/'
        });

        console.log('✅ SW registered');
        console.log('   Scope:', registration.scope);
        console.log('   Active:', registration.active?.state);


        navigator.serviceWorker.ready.then(() => registration.navigationPreload.enable());

        registration.update(); // check for updates, does that make sense?
        setInterval(() => registration.update(), 30 * 1000); // regularly

        return registration;
    } catch (error) {
        console.error('❌ SW registration failed:', error);
        return null;
    }
}

export function onUpdateAvailable(callback) {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(registration => {
        // update found
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // new SW is waiting, the old one is still active
                    callback(newWorker);
                }
            });
        });

        // check for updates manually right away??
    });

    // the controller changed (after skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Controller changed - reloading');
        //callback();
    });
}

// activate the new update
export function skipWaiting() {
  const controller = navigator.serviceWorker.controller;
  if (!controller) {
    console.warn('⚠️ No active service worker');
    return;
  }
  controller.postMessage({ type: 'SKIP_WAITING' });
}

// listen to cache events
export function onCacheServed(callback) {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'CACHE_SERVED') callback(event.data);
  });
}

