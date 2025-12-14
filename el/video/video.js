
class U2Video extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._video = null;
        this._container = null;
        this._playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        this._overlayTimeout = null;
    }

    static observedAttributes = [
        'src', 'poster', 'preload', 'autoplay', 'loop', 'muted', 
        'controls', 'width', 'height', 'playsinline', 'crossorigin',
        'playback-speed', 'picture-in-picture'
        ];

    connectedCallback() {
        this.render();
        this.setupVideo();
        this.setupControls();
        this.setupKeyboardShortcuts();
    }

    render() {
        const styles = `
        <style>
            :host {
                --gap:.7em;
                color:#fff;
                display: block;
                position: relative;
                background: #000;
                -webkit-tap-highlight-color: transparent;
                container-type: inline-size;
                contain: layout paint;
                line-height:1.2;
            }
            * { box-sizing: border-box; }
            button {
                font:inherit;
                color: inherit;
                background: none;
                border: 0;
                cursor: pointer;
                padding: var(--gap);
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: .25rem;
                transition: background .2s, outline-color .2s;
            }
            button:focus-visible {
                outline: 0.125rem solid color-mix(in oklab, currentColor 70%, transparent);
                outline-offset: 0.125rem;
            }
            button:hover {
                background: rgba(255,255,255,0.1);
            }
            svg {
                fill:currentColor;
                height:1.5em;
            }
            ::slotted(video), video {
                width:100%;
                display:block;
                /* object-fit: contain; */
            }

            #container {
                font-size: clamp(10px, 1em, 3cqw);
                position: relative;
                width: 100%;
                background: var(--u2-video-bg, #000);
            }
            #container {
                aspect-ratio: 16 / 9;
            }
            #controls {
                position: absolute;
                inset-inline: 0;
                inset-block-end: 0;
                --bg: #000;
                @supports (--bg:contrast-color(currentColor)) {
                    --bg: contrast-color(currentColor);
                }
                background: linear-gradient(to top, color-mix(in srgb, var(--bg) 80%, #0000), #0000);
                padding: var(--gap);
                padding-block-start:2em;
                transition: opacity .4s;
                z-index: 2;
                opacity: 0;

                display: grid;
                gap: .4rem;
                grid-template-columns: auto auto 1fr auto auto;
                grid-template-areas:
                    "progress progress progress progress progress"
                    "play volume time speed fullscreen";
                alitn-items: stretch;
                justify-items: stretch;
            }
            
            #container:hover #controls, #controls:focus-within, #controls.show { opacity: 1; }
            
            #progressBar {
                grid-area: progress;
                height: .3em;
                border: solid #0000;
                border-width: var(--gap) 0;
                margin-block: calc(var(--gap) * -1);
                box-sizing: content-box;
                cursor: pointer;
                position: relative;
                > * {
                    position: absolute;
                    inset:0;
                    border-radius:99px;
                }
                > .-all {
                    background: color-mix(in oklab, currentColor 15%, transparent);
                }
                > .-buffered {
                    background: color-mix(in oklab, currentColor 40%, transparent);
                    width: 0%;
                }
                > .-filled {
                    background: currentColor;
                    width: 0%;
                }
            }

            .controls-row { display: contents; }

            #playPause { grid-area: play; }
            .volume-container { grid-area: volume; }
            #timeDisplay {
                grid-area: time;
                align-self: center;
                min-width: 0;
                white-space: nowrap;
            }
            #speedToggle { grid-area: speed; }
            #fullscreenToggle { grid-area: fullscreen; }
            
            /*
            .volume-container {
                display: flex;
                align-items: center;
                gap: var(--gap);
            }
            input[type="range"] {
                width: 5rem;
                height: 0.25rem;
                -webkit-appearance: none;
                background: rgba(255,255,255,0.3);
                border-radius: 0.125rem;
                outline: none;
                accent-color: var(--u2-video-accent);
            }
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 0.75rem;
                height: 0.75rem;
                background: white;
                border-radius: 50%;
                cursor: pointer;
            }
            */
            
            #timeDisplay {
                margin-inline: var(--gap);
            }

            #speedToggle { anchor-name: --u2-speed-toggle; }

            #speedMenu {
                background: rgba(0,0,0,0.3);
                color:inherit;
                border-radius: 0.25rem;
                min-width: 5rem;
                border:0;
                &:not(:popover-open) { display: none; }
            }

            @supports (anchor-name: --a) and (top: anchor(bottom)) {
                #speedMenu {
                    position-anchor: --u2-speed-toggle;
                    inset-block-end: anchor(top);
                    inset-inline-end: anchor(right);
                    margin-block-end: 0;
                    margin-inline-end: 0;
                }
            }
            .speed-option {
                width: 100%;
            }
            .speed-option.active {
                background: var(--color, rgba(37,99,235,0.5));
            }
            
            #overlay {
                position: absolute;
                inset:0;
                font-size: 6em;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
                z-index: 3;
                display:flex;
                align-items:center;
                justify-content:center;
                &.show { opacity: 1; }
            }

            @media (prefers-reduced-motion: reduce) {
                #controls, #overlay, button { transition: none; }
            }
            @media (hover: none) { 
                #container:active #controls { opacity: 1; }
            }
        </style>
        `;

        this.shadowRoot.innerHTML = `
        ${styles}
        <div id="container">
            <slot></slot>
            <div id=overlay></div>
            <div id=controls part=controls>
                <div id=progressBar>
                    <div class=-all></div>
                    <div class=-buffered id=progressBuffered></div>
                    <div class=-filled id=progressFilled></div>
                </div>
                <button id=playPause title="Play/Pause (Space)">${svg.play}</button>
                <div class=volume-container>
                    <button id=muteToggle title="Mute (M)">${svg.mute}</button>
                    <!--input type=range id=volumeSlider min=0 max=1 step="0.1" value=1-->
                </div>
                <span id=timeDisplay>0:00 / 0:00</span>
                <button id=speedToggle title="Playback Speed" popovertarget="speedMenu" popovertargetaction="toggle">1x</button>
                <button id=fullscreenToggle title="Fullscreen (F)">${svg.fullscreen}</button>
                <div id=speedMenu popover></div>
            </div>
        </div>
        `;
    }

    setupVideo() {
        let videoEl = this.querySelector('video');

        if (!videoEl) {
            videoEl = document.createElement('video');
            const src = this.getAttribute('src');
            if (src) videoEl.src = src;
        }

        // Attribute übertragen
        const booleanAttrs = new Set(['autoplay', 'loop', 'muted', 'playsinline']);
        ['poster', 'preload', 'autoplay', 'loop', 'muted', 'playsinline', 'crossorigin'].forEach((attr) => {
            const val = this.getAttribute(attr);
            if (val === null) return;
            if (booleanAttrs.has(attr) || val === '' || val === 'true') {
                videoEl.setAttribute(attr, '');
                return;
            }
            videoEl.setAttribute(attr, val);
        });

        // Native controls verstecken
        videoEl.removeAttribute('controls');

        this._video = videoEl;
        this._container = this.$('container');

        // Video in Container einfügen falls nicht schon da
        !this.querySelector('video') && this._container.prepend(videoEl);

        // Events
        this._video.addEventListener('timeupdate', () => this.updateProgress());
        this._video.addEventListener('loadedmetadata', () => this.updateTimeDisplay());
        this._video.addEventListener('progress', () => this.updateBuffered());
        this._video.addEventListener('play', () => this.updatePlayButton());
        this._video.addEventListener('pause', () => this.updatePlayButton());
        this._video.addEventListener('volumechange', () => this.updateVolumeDisplay());
    }

    setupControls() {
        if (!this.hasAttribute('controls')) {
            this.$('controls').style.display = 'none';
            return;
        }

        const controls = this.$('controls');
        const playPause = this.$('playPause');
        const muteToggle = this.$('muteToggle');
        const progressBar = this.$('progressBar');
        const fullscreenToggle = this.$('fullscreenToggle');
        const speedToggle = this.$('speedToggle');
        const speedMenu = this.$('speedMenu');
        //const volumeSlider = this.$('volumeSlider');

        playPause.addEventListener('click', () => this.togglePlay());
        muteToggle.addEventListener('click', () => this.toggleMute());
        fullscreenToggle.addEventListener('click', () => this.toggleFullscreen());
        //volumeSlider.addEventListener('input', (e) => this._video.volume = Number(e.target.value));

        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            if (!Number.isFinite(this._video.duration) || this._video.duration <= 0) return;
            this._video.currentTime = percent * this._video.duration;
        });

        // Playback speed
        if (this.hasAttribute('playback-speed')) {
            this._playbackRates.forEach(rate => {
                const btn = document.createElement('button');
                btn.className = 'speed-option';
                btn.textContent = `${rate}x`;
                if (rate === 1) btn.classList.add('active');
                btn.addEventListener('click', () => {
                    this._video.playbackRate = rate;
                    speedToggle.textContent = `${rate}x`;
                    speedMenu.querySelectorAll('.speed-option').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (typeof speedMenu.hidePopover === 'function') speedMenu.hidePopover();
                    else speedMenu.removeAttribute('open');
                });
                speedMenu.appendChild(btn);
            });
        } else {
            speedToggle.style.display = 'none';
        }


        // Click auf video = play/pause
        this._video.addEventListener('click', () => this.togglePlay());

        // Touch events für mobile
        let controlsTimeout;
        this._container.addEventListener('touchstart', () => {
            controls.classList.add('show');
            clearTimeout(controlsTimeout);
            controlsTimeout = setTimeout(() => {
                if (!this._video.paused) controls.classList.remove('show');
            }, 3000);
        });
    }

    setupKeyboardShortcuts() {

        this.setAttribute('tabindex', '0');

        this.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.skip(-10);
                    this.showOverlay(svg.fastRewind + ' 10s');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.skip(10);
                    this.showOverlay(svg.fastForeward + ' 10s');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this._video.volume = Math.min(1, this._video.volume + 0.1);
                    this.showOverlay(svg.unmute + ` ${Math.round(this._video.volume * 100)}%`);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this._video.volume = Math.max(0, this._video.volume - 0.1);
                    const icon = this._video.volume === 0 ? svg.mute : svg.unmute;
                    this.showOverlay(icon + ` ${Math.round(this._video.volume * 100)}%`);
                    break;
                case 'm':
                    e.preventDefault();
                    this.toggleMute();
                    break;
                case 'f':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case '0': case '1': case '2': case '3': case '4':
                case '5': case '6': case '7': case '8': case '9':
                    e.preventDefault();
                    const percent = parseInt(e.key) / 10;
                    this._video.currentTime = this._video.duration * percent;
                    this.showOverlay(`${e.key}0%`);
                    break;
            }
        });
    }

    togglePlay() {
        if (this._video.paused) {
            this._video.play();
            this.showOverlay(svg.play);
        } else {
            this._video.pause();
            this.showOverlay(svg.pause);
        }
    }

    toggleMute() {
        this._video.muted = !this._video.muted;
        this.showOverlay(this._video.muted ? svg.mute : svg.unmute);
    }

    skip(seconds) {
        this._video.currentTime += seconds;
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    showOverlay(text) {
        const overlay = this.$('overlay');
        overlay.innerHTML = text;
        overlay.classList.add('show');
        clearTimeout(this._overlayTimeout);
        this._overlayTimeout = setTimeout(() => overlay.classList.remove('show'), 500);
    }

    updateProgress() {
        const percent = (this._video.currentTime / this._video.duration) * 100;
        this.$('progressFilled').style.width = `${percent}%`;
        this.updateTimeDisplay();
    }

    updateBuffered() {
        if (this._video.buffered.length > 0) {
            const bufferedEnd = this._video.buffered.end(this._video.buffered.length - 1);
            const percent = (bufferedEnd / this._video.duration) * 100;
            this.$('progressBuffered').style.width = `${percent}%`;
        }
    }

    updateTimeDisplay() {
        const current = formatTime(this._video.currentTime);
        const duration = formatTime(this._video.duration);
        this.$('timeDisplay').textContent = `${current} / ${duration}`;
    }

    updatePlayButton() {
        this.$('playPause').innerHTML = this._video.paused ? svg.play : svg.pause;
    }

    updateVolumeDisplay() {
        const muteBtn = this.$('muteToggle');
        //const volumeSlider = this.$('volumeSlider');
        const muted = this._video.muted || this._video.volume === 0;
        muteBtn.innerHTML = muted ? svg.mute : svg.unmute;
        //volumeSlider.value = this._video.muted ? 0 : this._video.volume;
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (!this._video) return;

        const booleanAttrs = new Set(['autoplay', 'loop', 'muted', 'playsinline']);
        switch (name) {
            case 'src':
                this._video.src = newVal;
                break;
            case 'poster':
            case 'preload':
            case 'crossorigin':
                this._video.setAttribute(name, newVal);
                break;
            case 'autoplay':
            case 'loop':
            case 'muted':
            case 'playsinline':
                if (!booleanAttrs.has(name)) break;
                if (newVal !== null) this._video.setAttribute(name, '');
                else this._video.removeAttribute(name);
                break;
        }
    }

    $(id) { return this.shadowRoot.getElementById(id); }
}


mirrorPrototypeMembers({
    TargetCtor: U2Video,
    SourceProto: HTMLVideoElement.prototype,
    forwardTo: (self) => self._video,
    stopAt: HTMLElement.prototype,
});

const svg = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z"></path></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A.998.998 0 0 0 8 6.82z"></path></svg>',
    unmute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.34-1.71-.71L7 9H4c-.55 0-1 .45-1 1zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 4.45v.2c0 .38.25.71.6.85C17.18 6.53 19 9.06 19 12s-1.82 5.47-4.4 6.5c-.36.14-.6.47-.6.85v.2c0 .63.63 1.07 1.21.85C18.6 19.11 21 15.84 21 12s-2.4-7.11-5.79-8.4c-.58-.23-1.21.22-1.21.85z"></path></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.63 3.63a.996.996 0 0 0 0 1.41L7.29 8.7L7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91c-.36.15-.58.53-.58.92c0 .72.73 1.18 1.39.91c.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 1 0 1.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87c0-3.83-2.4-7.11-5.78-8.4c-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0 0 14 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"></path></svg>',
    fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3c.55 0 1-.45 1-1s-.45-1-1-1H7v-2c0-.55-.45-1-1-1zm0-4c.55 0 1-.45 1-1V7h2c.55 0 1-.45 1-1s-.45-1-1-1H6c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1zm11 7h-2c-.55 0-1 .45-1 1s.45 1 1 1h3c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1s-1 .45-1 1v2zM14 6c0 .55.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1V6c0-.55-.45-1-1-1h-3c-.55 0-1 .45-1 1z"></path></svg>',
    fullscreenExit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3c.55 0 1-.45 1-1s-.45-1-1-1H7v-2c0-.55-.45-1-1-1zm0-4c.55 0 1-.45 1-1V7h2c.55 0 1-.45 1-1s-.45-1-1-1H6c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1zm11 7h-2c-.55 0-1 .45-1 1s.45 1 1 1h3c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1s-1 .45-1 1v2zM14 6c0 .55.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1V6c0-.55-.45-1-1-1h-3c-.55 0-1 .45-1 1z"></path></svg>',
    fastForeward: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L5.58 7.11C4.91 6.65 4 7.12 4 7.93v8.14c0 .81.91 1.28 1.58.82zM13 7.93v8.14c0 .81.91 1.28 1.58.82l5.77-4.07c.56-.4.56-1.24 0-1.63l-5.77-4.07c-.67-.47-1.58 0-1.58.81z"></path></svg>',
    fastRewind: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 16.07V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.56.4-.56 1.24 0 1.63l5.77 4.07c.67.47 1.58 0 1.58-.81zm1.66-3.25l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07a1 1 0 0 0 0 1.64z"></path></svg>',
}

customElements.define('u2-video', U2Video);



/* helper functions */



function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}


function mirrorPrototypeMembers({
    TargetCtor,
    SourceProto,
    forwardTo = (self) => self._video,
    stopAt = null,
}) {
    const targetProto = TargetCtor.prototype;
    const seen = new Set();

    for (let proto = SourceProto; proto && proto !== stopAt; proto = Object.getPrototypeOf(proto)) {
        for (const key of Object.getOwnPropertyNames(proto)) {
            if (key === 'constructor') continue;
            if (seen.has(key)) continue;
            seen.add(key);

            if (Object.prototype.hasOwnProperty.call(targetProto, key)) continue;

            const desc = Object.getOwnPropertyDescriptor(proto, key);
            if (!desc) continue;

            const nextDesc = {};

            if (typeof desc.value === 'function') {
                nextDesc.value = function (...args) {
                    const target = forwardTo(this);
                    return target[key](...args);
                };
                nextDesc.writable = true;
            } else {
                if (typeof desc.get === 'function') {
                    nextDesc.get = function () {
                        const target = forwardTo(this);
                        return target[key];
                    };
                }
                if (typeof desc.set === 'function') {
                    nextDesc.set = function (val) {
                        const target = forwardTo(this);
                        target[key] = val;
                    };
                }
            }

            nextDesc.enumerable = desc.enumerable;
            nextDesc.configurable = true;
            Object.defineProperty(targetProto, key, nextDesc);
        }
    }
}
