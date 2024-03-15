/* Copyright (c) 2016 Tobias Buschor https://goo.gl/gl0mbf | MIT License https://goo.gl/HgajeK */

import {SelectorObserver} from '../../js/SelectorObserver/SelectorObserver.js'

new SelectorObserver({
    on: (el) => {
        //const el = this.element;
        const style = getComputedStyle(el);
        const threshold = parseFloat(style.getPropertyValue('--u1-intersect-threshold').trim()) || 0;
        const margin = style.getPropertyValue('--u1-intersect-margin') || '0px';

        const thresholds = new Set([threshold, 0, 1, 0.5]);

        el.u1IntersectionObserver = new IntersectionObserver(entries=>{
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
            el.setAttribute('u1-intersect', attrValue);
            el.classList[onTarget?'add':'remove']('u1-intersected');

            //var event = new CustomEvent('u1-intersected-'+(onTarget?'in':'out'), /*{bubbles:true}*/ );
            //el.dispatchEvent(event);
        }, {
            //root: document.scrollingElement,
            rootMargin: margin,
            threshold: thresholds,
        });
        el.u1IntersectionObserver.observe(el);

    },
    off: (el) => {
        if (el.u1IntersectionObserver) el.u1IntersectionObserver.unobserve(el);
    }
}).observe('[u1-intersect]');

/*
old code:
import 'https://cdn.jsdelivr.net/npm/wicked-elements@3.1.2/min.js';
wickedElements.define(
    '[u1-intersect]', {
        init() {},
        connected() {
            const el = this.element;
            const style = getComputedStyle(el);
            const threshold = parseFloat(style.getPropertyValue('--u1-intersect-threshold').trim()) || 0;
            const margin = style.getPropertyValue('--u1-intersect-margin') || '0px';

            const thresholds = new Set([threshold, 0, 1, 0.5]);

            this.u1IntersectionObserver = new IntersectionObserver(entries=>{
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
				el.setAttribute('u1-intersect', attrValue);
                el.classList[onTarget?'add':'remove']('u1-intersected');

                //var event = new CustomEvent('u1-intersected-'+(onTarget?'in':'out'), /*{bubbles:true}* / );
                //el.dispatchEvent(event);
			}, {
				//root: document.scrollingElement,
				rootMargin: margin,
				threshold: thresholds,
			});
            this.u1IntersectionObserver.observe(el);
        },
        disconnected() {
            this.u1IntersectionObserver.unobserve(el);
        },
    }
);
*/