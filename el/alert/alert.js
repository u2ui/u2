
const icoCssUrl = import.meta.resolve('../../el/ico/ico.css');

const style = `
@import url('${icoCssUrl}');
:host:not([dismissable])::part(close) { display:none; } /* TODO: does not work in chrome */
:host(:not([dismissable]))::part(close) { display:none; } /* TODO: does not work in chrome */
:host {
    --u2-ico-dir:'https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.11/svg/{icon}/baseline.svg';
    
    /* its a inline-size container */
    
    container-type: inline-size;

}
#container {
    display:grid;
    gap: .5em .9em;    
    grid-template-columns: auto 1fr auto;
}


slot {
    display:block;
}
slot[name=icon] {
    align-self: center;
    font-size:1.7em;
    color:var(--color);
    &::slotted(*), & > u2-ico {
        display:block;
        font-size:inherit;
    }
}
#close {
    flex: 0 0 auto;
    padding: 0;
    border: 0;
    background: none;
    font-size: 1.5em;
    cursor: pointer;
    line-height: 1;
}
#body {
    display:flex;
    flex-wrap:wrap;
    align-items: center;
    gap: .6em 1em;

    & #content {
        flex:1 1 15em;
    }

    & slot[name=action] {
        flex: 0 1 auto;
        display: flex;
        justify-content: end;                    
        flex-wrap: wrap;
        gap: .5em;
        margin-inline-start: auto;
        &::slotted(button) {
            margin:0 !important;
        }
    }
}

@container (max-width: 27rem) {
    slot[name=icon] {
        align-self: start;
    }
    #body {
        grid-column-start: -1;
        grid-column-end: 1;
    }
    #close {
        align-self: start;
        grid-row-start: 1;
        grid-column-start: 3;
    }
}


/* slot[name=action]:empty-slot { display:none; } not possible */`;


class alert extends HTMLElement {
    constructor() {
        super();

        import('../../attr/focusgroup/focusgroup.js');
        import('../ico/ico.js');

        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <style>${style}</style>
            <div id=container>
                <slot name=icon part=icon></slot>
                <div id=body>
                    <slot id=content></slot>
                    <slot name=action u2-focusgroup></slot>
                </div>
                <button id=close part=close aria-label=close>
                    <svg viewBox="0 0 15 15" style="display:block;width:.7em" aria-hidden="true"><path d="M1.5 1.5l12 12m-12 0l12-12" stroke="currentColor"></path></svg>
                </button>
            </div>
        `;
    }
    connectedCallback() {
        // const variant = this.getAttribute('variant');
        // const icon = this.getAttribute('icon') || variantData[variant]?.icon || 'info';
        // this.shadowRoot.querySelector('[name=icon]').innerHTML = `<u2-ico icon=${icon}></u2-ico>`;
        // this.shadowRoot.getElementById('container').setAttribute('role', variantData[variant]?.role || 'status');
        this.shadowRoot.querySelector('#close').onclick = () => this.hide();
    }
    static observedAttributes = ['icon', 'variant'];
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name==='variant') {
            const variant = this.getAttribute('variant');
            this.shadowRoot.getElementById('container').setAttribute('role', variantData[variant]?.role || 'status');
        }
        if (name==='variant' || name==='icon') {
            const variant = this.getAttribute('variant');
            const icon = this.getAttribute('icon') || variantData[variant]?.icon || 'info';
            this.shadowRoot.querySelector('[name=icon]').innerHTML = `<u2-ico icon=${icon}></u2-ico>`;
        }
    }

    // show() { // todo
    //     this.setAttribute('open', '');
    //     this.setAttribute('aria-live', 'assertive');
    //     getToolsContainer().appendChild(this);

    //     // autohide and role=alertdialog if no actions
    //     const hasActions = this.querySelector('[slot=action]')?.assignedElements().length > 0;
    //     if (hasActions) {
    //         this.setAttribute('role', 'alertdialog');
    //     } else {
    //         clearTimeout(this.hideTimeout);
    //         this.hideTimeout = setTimeout(() => this.hide(), 5000);
    //     }
    //     return new Promise((resolve) => {
    //         this.resolve = resolve;
    //     });
    // }
    hide() {
        this.removeAttribute('open');
        this.resolve?.();
    }
}

const variant2Icon = {info:'info',success:'check',warn:'warning',error:'error'};
const variantData = {
    info: {
        icon: 'info',
        role: 'status',
    },
    success: {
        icon: 'check',
        role: 'status',
    },
    warn: {
        icon: 'warning',
        role: 'alert',
    },
    error: {
        icon: 'error',
        role: 'alert',
    }
};

customElements.define('u2-alert', alert);

/*
alert = function(message, type, options) {
    const el = document.createElement('u2-alert');
    el.textContent = message;
    options.icon && el.setAttribute('icon', options.icon);
    el.setAttribute('type', type??'info');
    return el.show();
}
export info = (message, options) => alert(message, 'info', options);
export success = (message, options) => alert(message, 'success', options);
export warn = (message, options) => alert(message, 'warn', options);
export error = (message, options) => alert(message, 'error', options);
*/



/*
function getToolsContainer() {
    const el = document.getElementById('u2-notification-stack');
    if (el) return el;
    const div = document.createElement('div');
    div.id = 'u2-notification-stack';
    document.body.appendChild(div);
    return div;
}
*/


// class Waiter {
//     constructor(callback, duration) {
//         this.callback = callback;
//         this.duration = duration;
//         this.startTime = null;
//         this.timerId = null;
//         this.onProgress = null;
//         this.pauseTime = false; // Zeitpunkt, zu dem die Pause gestartet wurde
//         this.remaining = duration; // Verbleibende Zeit bis zum Ablauf des Timers
//     }
//     start() {
//         this.pauseTime = null;
//         this.startTime = Date.now();
//         this._startTimer();
//         return new Promise((resolve) => {
//             this.resolve = resolve;
//         });
//     }
//     pause() {
//         if (this.pauseTime) return;
//         clearTimeout(this.timerId);
//         this.pauseTime = Date.now();
//         this.remaining -= this.pauseTime - this.startTime; // Aktualisiere die verbleibende Zeit
//     }
//     _startTimer() {
//         this.timerId = setTimeout(() => {
//             this.callback?.();
//             this._clear();
//         }, this.remaining);
//         if (this.onProgress) this._emitProgress();
//     }
//     _emitProgress() {
//         const interval = 100; // Wie oft der Fortschritt aktualisiert wird (in ms)
//         const intervalId = setInterval(() => {
//             const now = Date.now();
//             const passed = now - this.startTime;
//             const left = this.duration - passed;
//             const progress = Math.min((passed / this.duration), 1);
//             this.onProgress({ left, passed, progress });
//             if (passed >= this.duration) clearInterval(intervalId);
//         }, interval);
//     }
//     _clear() {
//         clearTimeout(this.timerId);
//         this.resolve();
//         this.startTime = null;
//         this.timerId = null;
//         this.pauseTime = false;
//         this.remaining = this.duration; // Zurücksetzen der verbleibenden Zeit
//     }
// }
