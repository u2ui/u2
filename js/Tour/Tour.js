import { Placer } from '../Placer/Placer.js';

export class Tour extends EventTarget {
    constructor(steps) {
        super();
        this.steps = steps;
    }

    start() { return this.show(0); }

    async show(index) {
        const step = this.steps[index];
        if (!step) return;

        const pending = this.pending = {};
        const target = typeof step.target === 'function' ? await step.target(this) : typeof step.target === 'string' ? document.querySelector(step.target) : step.target;
        if (this.pending !== pending) return;
        if (!target) throw new Error(`Tour target not found: ${step.target}`);
        const content = await step.content;
        if (this.pending !== pending) return;
        this.target = target;
        const opened = !this.info;
        if (opened) this.#create();

        this.current = index;
        this.content.replaceChildren(content instanceof Node ? content.cloneNode(true) : content);
        this.info.ariaLabel = text('step').replace('{i}', index + 1).replace('{n}', this.steps.length);
        this.backButton.disabled = index === 0;
        this.nextButton.textContent = text(index === this.steps.length - 1 ? 'done' : 'next');
        this.target.scrollIntoView({block:'nearest', inline:'nearest'});
        this.placer.followElement(this.target);
        this.#draw();
        if (opened) this.nextButton.focus();
        this.dispatchEvent(new CustomEvent('step', {detail:{step, index}}));
    }

    next() { return this.current === this.steps.length - 1 ? this.stop('complete') : this.show(this.current + 1); }
    back() { return this.show(this.current - 1); }

    stop(event = 'close') {
        this.placer?.unfollow();
        this.host?.remove();
        document.removeEventListener('scroll', this.#scheduleDraw, true);
        globalThis.removeEventListener('resize', this.#scheduleDraw);
        clearInterval(this.drawInterval);
        cancelAnimationFrame(this.drawFrame);
        this.drawFrame = 0;
        this.pending = null;
        this.host = this.info = this.target = null;
        if (this.returnFocus?.isConnected) this.returnFocus.focus();
        this.returnFocus = null;
        this.dispatchEvent(new Event(event));
    }

    #create() {
        import('../../attr/focusgroup/focusgroup.js');
        this.returnFocus = document.activeElement;
        const host = this.host = document.createElement('div');
        document.documentElement.append(host);
        host.popover = 'manual';
        host.style.cssText = `
            xposition: fixed !important;
            xinset: 0 !important;
            pointer-events: none !important;
            border:0; padding:0; margin:0;
        `;

        const root = host.attachShadow({mode:'closed'});
        root.innerHTML = `
            <style>
                svg {
                    position: fixed;
                    inset: 0;
                    width: 120%;
                    height: 120%;
                }
                .hole { transition: all .15s; filter:blur(4px); }
                slot { pointer-events: none; }
            </style>
            <svg aria-hidden=true focusable=false>
                <defs>
                    <mask id=spotlight>
                        <rect width="100%" height="100%" fill="white"/>
                        <rect class=hole rx=8 fill="black"/>
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="#000a" mask="url(#spotlight)"/>
            </svg>
            <slot></slot>
        `;
        host.showPopover();

        this.hole = root.querySelector('.hole');
        document.addEventListener('scroll', this.#scheduleDraw, {passive:true, capture:true});
        globalThis.addEventListener('resize', this.#scheduleDraw, {passive:true});
        this.drawInterval = setInterval(this.#scheduleDraw, 200);

        const info = this.info = document.createElement('dialog');
        info.className = 'u2TourInfo';
        info.open = true;
        info.style.cssText = `
            position: fixed !important;
            pointer-events: auto;
            margin: 0;
            margin-left:3px;
        `;
        info.innerHTML = `
            <div style="margin-bottom:1em;">
                <button class="u2-unstyle u2TourClose" aria-label="${text('close')}" style="float:right;">
                    <u2-ico icon=close>&times;</u2-ico>
                </button>
                <div aria-live=polite aria-atomic=true class=u2TourContent></div>
            </div>
            <footer class=u2-flex u2-focusgroup style="justify-content:space-between;">
                <button class=u2TourBack>${text('back')}</button>
                <button class=u2TourNext>${text('next')}</button>
            </footer>
        `;
        info.onkeydown = e => {
            e.stopPropagation();
            if (e.key !== 'Escape') return;
            e.preventDefault();
            this.stop();
        };
        for (const event of ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'contextmenu']) {
            info.addEventListener(event, e => e.stopPropagation());
        }
        host.append(info);
        this.content = info.querySelector('.u2TourContent');
        [this.closeButton, this.backButton, this.nextButton] = info.querySelectorAll('button');
        this.backButton.onclick = () => this.back();
        this.nextButton.onclick = () => this.next();
        this.closeButton.onclick = () => this.stop();
        this.placer = new Placer(info, {margin:15});
    }

    #draw() {
        if (!this.target) return;
        const {left, top, width, height} = this.target.getBoundingClientRect();
        const margin = 7;
        Object.assign(this.hole.style, {
            x: `${left - margin}px`,
            y: `${top - margin}px`,
            width: `${width + margin * 2}px`,
            height: `${height + margin * 2}px`,
        });
    }

    #scheduleDraw = () => {
        if (this.drawFrame) return;
        this.drawFrame = requestAnimationFrame(() => {
            this.drawFrame = 0;
            this.#draw();
        });
    };
}

// The tour speaks the page's language (its lang attribute), else the browser's.
const text = key => {
    const lang = (document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase();
    return (texts[lang] ?? texts.en)[KEYS.indexOf(key)];
};
const KEYS = ['back', 'next', 'done', 'close', 'step'];
const texts = {
    ar: ['رجوع', 'التالي', 'تم', 'إغلاق الجولة', 'الخطوة {i} من {n}'],
    cs: ['Zpět', 'Další', 'Hotovo', 'Zavřít prohlídku', 'Krok {i} z {n}'],
    da: ['Tilbage', 'Næste', 'Færdig', 'Luk rundvisningen', 'Trin {i} af {n}'],
    de: ['Zurück', 'Weiter', 'Fertig', 'Tour schließen', 'Schritt {i} von {n}'],
    en: ['Back', 'Next', 'Done', 'Close tour', 'Tour step {i} of {n}'],
    es: ['Atrás', 'Siguiente', 'Listo', 'Cerrar recorrido', 'Paso {i} de {n}'],
    fi: ['Takaisin', 'Seuraava', 'Valmis', 'Sulje esittely', 'Vaihe {i}/{n}'],
    fr: ['Retour', 'Suivant', 'Terminé', 'Fermer la visite', 'Étape {i} sur {n}'],
    hi: ['पीछे', 'आगे', 'हो गया', 'टूर बंद करें', 'चरण {i} / {n}'],
    it: ['Indietro', 'Avanti', 'Fine', 'Chiudi il tour', 'Passo {i} di {n}'],
    ja: ['戻る', '次へ', '完了', 'ツアーを閉じる', 'ステップ {i}/{n}'],
    ko: ['이전', '다음', '완료', '둘러보기 닫기', '{n}단계 중 {i}단계'],
    nb: ['Tilbake', 'Neste', 'Ferdig', 'Lukk omvisningen', 'Trinn {i} av {n}'],
    nl: ['Terug', 'Volgende', 'Klaar', 'Rondleiding sluiten', 'Stap {i} van {n}'],
    pl: ['Wstecz', 'Dalej', 'Gotowe', 'Zamknij przewodnik', 'Krok {i} z {n}'],
    pt: ['Voltar', 'Seguinte', 'Concluir', 'Fechar tour', 'Passo {i} de {n}'],
    ru: ['Назад', 'Далее', 'Готово', 'Закрыть тур', 'Шаг {i} из {n}'],
    sv: ['Tillbaka', 'Nästa', 'Klar', 'Stäng rundturen', 'Steg {i} av {n}'],
    tr: ['Geri', 'İleri', 'Bitti', 'Turu kapat', 'Adım {i}/{n}'],
    uk: ['Назад', 'Далі', 'Готово', 'Закрити тур', 'Крок {i} з {n}'],
    zh: ['上一步', '下一步', '完成', '关闭导览', '第 {i} 步，共 {n} 步'],
};
texts.no = texts.nb;
