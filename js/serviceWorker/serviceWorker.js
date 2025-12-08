// Zentrale Registration - nur einmal aufrufen
export async function register(options = {}) {
    if (!('serviceWorker' in navigator)) return null;

    try {
        // Warten auf load event
        if (document.readyState !== 'complete') {
            console.log('not "load" yet, wait for register')
            await new Promise(resolve => {
                addEventListener('load', resolve, { once: true });
            });
        }

        const registration = await navigator.serviceWorker.register('../sw.js', {
            scope: options.scope || '/'
        });

        console.log('✅ SW registered');
        console.log('   Scope:', registration.scope);
        console.log('   Active:', registration.active?.state);


        navigator.serviceWorker.ready.then(async (readyReg) => {
            await registration.navigationPreload.enable();
        });

        registration.update(); // Updates checken, macht das sinn?
        setInterval(() => registration.update(), 30 * 1000); // regelmässsig

        return registration;
    } catch (error) {
        console.error('❌ SW registration failed:', error);
        return null;
    }
}

export function onUpdateAvailable(callback) {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(registration => {
        // Update gefunden
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Neuer SW wartet, alter ist noch aktiv
                    callback(newWorker);
                }
            });
        });

        // gleich Manuell auf Updates prüfen??
    });

    // Controller hat gewechselt (nach skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Controller changed - reloading');
        //callback();
    });
}

// Neues Update aktivieren
export function skipWaiting() {
  const controller = navigator.serviceWorker.controller;
  if (!controller) {
    console.warn('⚠️ No active service worker');
    return;
  }
  controller.postMessage({ type: 'SKIP_WAITING' });
}

// Cache-Events abhören
export function onCacheServed(callback) {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'CACHE_SERVED') {
      callback(event.data);
    }
  });
}

