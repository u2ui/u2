import {SelectorObserver} from '../../js/SelectorObserver/SelectorObserver.js';

const observer = new SelectorObserver({
    on: (el) => {

        const name = el.getAttribute('u2-behavior');
        const behavior = registry.get(name);

        if (!behavior) {
            console.warn('Behavior not found:', name, el);
            return;
        }

        const active = behavior.init?.(el);
        setStates(el, {active, inactive: !active, success: false, error: false});


        if ('hidden' in behavior) el.hidden = behavior.hidden(el);
        
        if (behavior.text) {
            const textEl = el.innerHTML ? el.querySelector('.-text') : el;
            if (textEl && !textEl.innerHTML) textEl.innerHTML = behavior.text.en;
        }

        if (behavior.action) {
            el.addEventListener('click', async (e)=>{
                el.inert = true;
                try {
                    const active = await behavior.action(e, el);
                    setStates(el, {active, inactive: !active, success: true, error: false});
                } catch (e) {
                    setStates(el, {error: true, success: false});
                }
                setTimeout(()=>setStates(el, {success: false, error: false}), 2000);
                el.inert = false;
            });
        }
        
    },
    off: (el) => {
    }
});

function setStates(el, states) {
    for (const state in states) {
        el.querySelector('.-'+state)?.toggleAttribute('hidden', !states[state]);
    }
}


const registry = new Map();

export function register(name, fn) {
    registry.set(name, fn);
}




/* default behaviors */


register('close',{
    action: (e, el) => {
        const target = el.closest('dialog,[popover]');
        target?.close?.();
        target?.hidePopover?.();
    },
    text: {
        de: 'Schließen',
        en: 'Close',
        fr: 'Fermer',
        it: 'Chiudi',
        es: 'Cerrar'
    }
});

register('share',{
    action: (e, el) => {
        const data = {
            title: el.dataset.title || document.title,
            text: el.dataset.text || document.title,
            url: el.dataset.url || location.href
        };
        return navigator.share(data);
    },
    text: {
        de: 'Teilen',
        en: 'Share',
        fr: 'Partager',
        it: 'Condividi',
        es: 'Compartir'
    }
});


register('once',{
    action: (e, el) => {
        localStorage.setItem('u2-behavior-once-'+el.id, true);
        el.hidden = true;
    },
    hidden(el){
        return localStorage.getItem('u2-behavior-once-'+el.id);
    }
});

register('print',{
    action: () => window.print(),
    text: {
        de: 'Drucken',
        en: 'Print',
        fr: 'Imprimer',
        it: 'Stampa',
        es: 'Imprimir'
    }
});

register('webapp.install',{
    init: (el) => {
        addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            el.hidden = false;
            el.addEventListener('click', () => {
                e.prompt();
            });
        });
    },
    hidden(){
        return navigator.standalone;
    },
    action: (e, el) => {
    },
    text: {
        de: 'Installieren',
        en: 'Install',
        fr: 'Installer',
        it: 'Installa',
        es: 'Instalar'
    }
});

register('fullscreen.toggle',{
    init: () => !!document.fullscreenElement,
    async action(e, el){
        const state = document.fullscreenElement;
        state ? await document.exitFullscreen() : await el.parentElement.requestFullscreen();
        return !state;
    },
    text: {
        de: 'Vollbild',
        en: 'Fullscreen',
        fr: 'Plein écran',
        it: 'Schermo intero',
        es: 'Pantalla completa'
    }
});



register('darkmode.toggle',{
    init: (el) => {
        const value = localStorage.u2Skin;
        document.documentElement.setAttribute('u2-skin', value);
        document.documentElement.setAttribute('data-theme', value); // compatibility
        return value === 'dark';
    },
    action: (e, el) => {
        const newVal = localStorage.u2Skin === 'dark' ? 'light' : 'dark';
        localStorage.u2Skin = newVal;
        document.documentElement.setAttribute('u2-skin', newVal);
        document.documentElement.setAttribute('data-theme', newVal);
        return newVal === 'dark';
    },
    text: {
        de: 'Dunkelmodus',
        en: 'Dark mode',
        fr: 'Mode sombre',
        it: 'Modalità scura',
        es: 'Modo oscuro'
    }
});



register('scroll', {
    init: (el) => {
        const checkScroll = () => el.hidden = window.scrollY < innerHeight / 2;
        addEventListener('scroll', checkScroll, {passive: true});
        checkScroll();
    },
    action: (e, el) => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    },
    // disconnect: (el) => {
    //     removeEventListener('scroll', checkScroll);
    // }
});


let wakeLock = null;
register('wakeLock', {
    init: (el) => {
        el.disabled = !('wakeLock' in navigator);
    },
    async action(e, el){
        if (wakeLock) {
            await wakeLock.release();
            wakeLock = null;
            return;
        }
        try {
            wakeLock = await navigator.wakeLock.request("screen");
            wakeLock.addEventListener('release', () => {
                setStates(el, {active:false, inactive: true});
                wakeLock = null;
            });
            return true;
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    },
    text: {
        de: 'Bildschirm wach halten',
        en: 'Keep screen awake',
        fr: 'Garder l\'écran allumé',
        it: 'Mantieni lo schermo acceso',
        es: 'Mantener la pantalla encendida'
    }
});



observer.observe('[u2-behavior]');
