
class DynamicScrollSpy {
    constructor(navElement) {
        this.navElement = navElement;
        this.observer = null;
        this.mutationObserver = null;
        this.ACTIVE_CLASS = 'active'; 
        //this.ROOT_MARGIN = '-30px'; 
        //this.ROOT_MARGIN = '0px 0px 0px 0px'; 
        this.ROOT_MARGIN = '2px 0px 20px 0px';
        this.init();
    }

    markId(id) {
        this.menuLinks.forEach(link => link.classList.remove(this.ACTIVE_CLASS));
        this.idLinkMap.get(id)?.classList.add(this.ACTIVE_CLASS);
    }
    recalibrate() {
        this.observer?.disconnect();
        
        this.menuLinks = [...this.navElement.querySelectorAll('a[href*="#"]')];

        this.idLinkMap = new Map();
        
        const currentURL = location.href.split('#')[0];
        const sections = this.menuLinks.map(link => {
            const [linkURL, rawHash] = link.href.split('#');
            if (linkURL === currentURL && rawHash) {
                const hash = decodeURIComponent(rawHash);
                const section = document.getElementById(hash);
                this.idLinkMap.set(hash, link);
                return section;
            }
        }).filter(Boolean);

        if (sections.length === 0) return;
        const options = {root:null, rootMargin:this.ROOT_MARGIN, threshold: 0.05 };
        const intersections = new Set();
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.markId(entry.target.id);
                    intersections.add(entry.target.id);
                } else {
                    intersections.delete(entry.target.id);
                    const last = [...intersections].at(-1);
                    this.markId(last);
                }
            });
        }, options);
        sections.forEach(section => this.observer.observe(section));
    }
    
    init() {
        this.recalibrate();
        this.mutationObserver = new MutationObserver(() => requestAnimationFrame(() => this.recalibrate()));
        this.mutationObserver.observe(this.navElement, { childList: true, subtree: true });
    }

    disconnect() {
        this.observer?.disconnect();
        this.mutationObserver?.disconnect();
    }
}


import {SelectorObserver} from '../../js/SelectorObserver/SelectorObserver.js';
new SelectorObserver({
    on: (navElement) => {
        navElement._scrollspyInstance = new DynamicScrollSpy(navElement);
    },
    off: (navElement) => {
        navElement._scrollspyInstance?.disconnect();
        delete navElement._scrollspyInstance;
    }
}).observe('[u2-scrollspy]');