/* Copyright (c) 2016 Tobias Buschor https://goo.gl/gl0mbf | MIT License https://goo.gl/HgajeK */

import {SelectorObserver} from '../../js/SelectorObserver/SelectorObserver.js'

new SelectorObserver({
    on: (el) => {
        //const el = this.element;
        const style = getComputedStyle(el);
        const threshold = parseFloat(style.getPropertyValue('--u2-intersect-threshold').trim()) || 0;
        const margin = style.getPropertyValue('--u2-intersect-margin') || '0px';

        const thresholds = new Set([threshold, 0, 1, 0.5]);

        el.u2IntersectionObserver = new IntersectionObserver(entries=>{
            let attrValue = '';
            const entry = entries[0];
            let ratio = entry.intersectionRatio;
            let onTarget = false;
            if (entry.isIntersecting) {
                for (const val of thresholds) {
                    if (ratio >= val) attrValue += ' '+val;
                }
                if (ratio >= threshold) onTarget = true;
            }


            if (entry.boundingClientRect.top + entry.boundingClientRect.height / 2 < innerHeight / 2) {
                attrValue += ' above';
            }

            attrValue = attrValue.trim();
            el.setAttribute('u2-intersect', attrValue);
            el.classList[onTarget?'add':'remove']('u2-intersected');

            const event = new CustomEvent('u2-intersect.'+(onTarget?'enter':'leave'), {bubbles:true} );
            el.dispatchEvent(event);
        }, {
            //root: document.scrollingElement,
            rootMargin: margin,
            threshold: thresholds,
        });
        el.u2IntersectionObserver.observe(el);

    },
    off: (el) => {
        if (el.u2IntersectionObserver) el.u2IntersectionObserver.unobserve(el);
    }
}).observe('[u2-intersect]');

/*
old code:
import 'https://cdn.jsdelivr.net/npm/wicked-elements@3.1.2/min.js';
wickedElements.define(
    '[u2-intersect]', {
        init() {},
        connected() {
            const el = this.element;
            const style = getComputedStyle(el);
            const threshold = parseFloat(style.getPropertyValue('--u2-intersect-threshold').trim()) || 0;
            const margin = style.getPropertyValue('--u2-intersect-margin') || '0px';

            const thresholds = new Set([threshold, 0, 1, 0.5]);

            this.u2IntersectionObserver = new IntersectionObserver(entries=>{
                let attrValue = '';
                const entry = entries[0];
                let ratio = entry.intersectionRatio;
                let onTarget = false;
                if (entry.isIntersecting) {
                    for (const val of thresholds) {
                        if (ratio >= val) attrValue += ' '+val;
                    }
                    if (ratio >= threshold) onTarget = true;
                }


                if (entry.boundingClientRect.top + entry.boundingClientRect.height / 2 < innerHeight / 2) {
                    attrValue += ' above';
                }

                attrValue = attrValue.trim();
				el.setAttribute('u2-intersect', attrValue);
                el.classList[onTarget?'add':'remove']('u2-intersected');

                //var event = new CustomEvent('u2-intersected-'+(onTarget?'in':'out'), /*{bubbles:true}* / );
                //el.dispatchEvent(event);
			}, {
				//root: document.scrollingElement,
				rootMargin: margin,
				threshold: thresholds,
			});
            this.u2IntersectionObserver.observe(el);
        },
        disconnected() {
            this.u2IntersectionObserver.unobserve(el);
        },
    }
);
*/