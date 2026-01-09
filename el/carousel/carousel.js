// todo add privet fields
/* element */
class u2Carousel extends HTMLElement {
	constructor() {
		super();

		let shadowRoot = this.attachShadow({mode:'open'});
		const svg = '<svg viewBox="0 0 9 18" width="9" height="18"><path d="M1 1l7 8-7 8"/></svg>';

		shadowRoot.innerHTML = `
		<style>
			:host {
				position:relative;
				contain: layout;
contain: layout style paint;  /* Neu ok? */
			}
			:host .-arrow {
				position:absolute;
				padding:1rem;
				inset-block:0;
				display:flex;
				cursor:pointer;
				border:0;
				background:none;
				user-select:none;
				width:auto;
				z-index:1;
				align-items:center;
				flex:0 0 auto; /* grow if controls are static */
				stroke-linejoin:round;
				stroke-linecap:round;
				stroke-width:.1rem;
				box-sizing:content-box;
				contain:layout;
				color:inherit;

contain: layout style paint;  /* Neu ok? */
			}
			:host .-prev { inset-inline-start: 0; }
			:host .-next { inset-inline-end: 0; }

			:host > .-arrow svg {
				fill:none;
				flex:1 1 auto;
				height: auto;
				stroke:currentColor;
				max-height:100%;
			}
			:host > .-prev svg {
				transform:rotate(180deg);
			}
			:host([item-count="0"]) > .-arrow, :host([item-count="1"]) > .-arrow {
				display:none;
			}
			:host > slot.body {
				flex:1 1 auto; /* grow if controls are static */
                z-index: 0;
			}
			::slotted([name=prev]) {
				display:block;
			}

			/* slide */
			:host([mode=slide]) {
				/*
				todo: important is too strong! what can i do to make just overwrite the css
				clip: prevent focus-scroll
				*/
				overflow:hidden !important;
				overflow:clip !important;
			}
			:host([mode=slide]) > slot.body {
				width:100%; /* needed bud why? */
				display:flex;
				transition: transform var(--u2-carousel-animation-speed, .7s) ease-out;
				will-change: transform;
				overflow: visible;
			}
:host([mode=slide]) > slot.body::slotted(*) {
    contain: layout style paint;
}


			/* scroll */
			:host([mode=scroll]) {
				overflow:visible !important;
			}
			:host([mode=scroll]) > slot.body {
				display:flex;
				overflow:auto !important;
				scroll-snap-type: x mandatory;
				scrollbar-width: none;  /* Firefox */
			}
			:host([mode=scroll]) > slot.body::-webkit-scrollbar {
				display: none;  /* Safari and Chrome */
			}

			/* fade */
			:host([mode=fade]) {
				display:flex !important;
				z-index:0;
				overflow: visible !important;
			}
			:host([mode=fade]) .body {
				display:flex;
			}
			:host([mode=fade]) .body::slotted(*) {
				transition:opacity var(--u2-carousel-animation-speed, .7s) ease-in-out;
				will-change: opacity;
				opacity:0 !important;
				margin-left:-100% !important;
			}
				
			:host([mode=fade]) .body::slotted(:not([slot]):first-of-type)  {
				margin-left:0 !important;
			}
			:host([mode=fade]) .body::slotted([aria-hidden=false]) {
				opacity:1 !important;
				z-index:1;
			}
		</style>
		<button part="control prev" class="-arrow -prev" aria-label="previous slide">
			<slot name=prev aria-hidden=true>${svg}</slot>
		</button>
		<slot class=body tabindex=-1></slot>
		<button part="control next" class="-arrow -next" aria-label="next slide">
			<slot name=next aria-hidden=true>${svg}</slot>
		</button>
		`;

		setTimeout(()=>{ !this.active && this.next(); }); // this way i can add eventlistener that reacts to the change
		this._nextDelayed = this._nextDelayed.bind(this);
		this._onSlotChange = this._onSlotChange.bind(this);


		this.slider = this.shadowRoot.querySelector('slot.body');

		this.mode = this.getAttribute('mode');

		const prev = this.shadowRoot.querySelector('.-prev');
		const next = this.shadowRoot.querySelector('.-next');
		next.addEventListener('click',()=>this.next());
		prev.addEventListener('click',()=>this.prev());

        // this.addEventListener('beforematch', e=>{ // todo: findable
        //     let el = e.target;
        //     while (el && el.parentNode) {
        //         if (el.parentNode === this) {
        //             e.preventDefault();
        //             this.slideTo(el);
        //             return;
        //         }
        //         el = el.parentElement;
        //     }
        // })


	}
	_onSlotChange(){
		this.setAttribute('item-count', this._items().length);
	}

	static observedAttributes = ['play', 'autoplay', 'mode'/*, 'tabindex'*/]; // zzz "play"
	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		if (name === 'play') { console.warn('play is deprecated, use autoplay'); let play = this.hasAttribute('play'); this[play?'play':'stop'](); }  // zzz
		if (name === 'autoplay') this[newValue===null?'stop':'play']();
		if (name === 'mode') this.mode = newValue;
	}
	set mode(mode){
		if (!u2Carousel.mode[mode]) mode = 'slide';
		this.setAttribute('mode', mode);
		this.handler = u2Carousel.mode[mode];
		this.handler.init && this.handler.init.call(this);
	}
	get mode(){
		return this.getAttribute('mode');
	}
	_items(){
		return this.slider.assignedElements({flatten:true});
	}
	activeIndex(){
		return Array.prototype.indexOf.call(this._items(), this.active);
	}
	slideTo(target){
		
		if (target==null) return;

		if (typeof target === 'number') target = this._items()[target]; // by index

		if (Array.from(this._items()).indexOf(target) === -1) console.error('target not a child of this slider!')

		if (this.active !== target) { // just trigger if not active
			for (let child of this._items()) {
				child.ariaHidden = target !== child;
                // target !== child ? child.setAttribute('hidden', 'until-found') : child.removeAttribute('hidden'); // todo: findable
			}
			this.active = target;

			target.dispatchEvent(new CustomEvent('u2-carousel.slide',{
				bubbles:true,
				detail:{
					slide:target,
					index:Array.prototype.indexOf.call(this._items(), target),
					slider:this,
				}
			}));
		}
		this.handler.slideTo && this.handler.slideTo.call(this, target); // needed if not active?
	}
	next(){ this.slideTo(this._sibling('next')); }
	prev(){ this.slideTo(this._sibling('prev')); }

	_sibling(direction){
		const items = this._items();
		let sibling = this.active || items.at(-1);
		const index = this.activeIndex();
		if (!sibling) return; // no slide
		while (1) {
			sibling = direction === 'prev'
				? items[index-1] || items.at(-1)
				: items[index+1] || items.at(0);
			break; // also hidden
			// if (sibling.offsetParent) break; // next visible // can cause infinite loops!!
			if (sibling === this.active) break; // only one
		}
		return sibling;
	}
	play(){
		this.addEventListener('u2-carousel.slide', this._nextDelayed);
		this._nextDelayed();
	}
	stop(){
		this.removeEventListener('u2-carousel.slide', this._nextDelayed)
		clearTimeout(this._nextDelayedTimeout);
	}
	_nextDelayed(){
		clearTimeout(this._nextDelayedTimeout);

		let speed = this.customProperty('slideshow-speed');
		if (speed==='') speed = '6000';
		const unit = speed.match(/[^0-9]*$/)[0];
		speed = parseFloat(speed);
		if (unit === 's') speed *= 1000;

		this._nextDelayedTimeout = setTimeout(()=>{
			if (this.contains(document.activeElement)) return;
			this.next();
		},speed);
	}
	customProperty(property){
		return getComputedStyle(this).getPropertyValue('--u2-carousel-'+property);
	}
	connectedCallback() {
		this.hasAttribute('play') && this.play();
		this.slider.addEventListener('slotchange', this._onSlotChange);
		//this._updateItemCount(); // needed here?
	}
	disconnectedCallback() {
		this.slider && this.slider.removeEventListener('slotchange', this._onSlotChange);
	}
}


u2Carousel.mode = {};

// scroll
u2Carousel.mode.scroll = {
	slideTo:function(target){
		let left = target.offsetLeft - this.slider.offsetLeft;
		this.slider.scroll({ // todo: better calculation of offset
			top: target.offsetTop,
			left: left,
			behavior: 'smooth'
		});
	},
	init:function(){
		this.slider.style.transform = ''; // if changed from mode=slide

		this.slider.addEventListener('scroll',()=>{ // trigger on manual scroll
			clearTimeout(this.scroll_sliding_timeout);
			this.scroll_sliding_timeout = setTimeout(()=>{
				const rect = this.slider.getBoundingClientRect();
				const targets = document.elementsFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
				for (let target of targets) {
					if (target.parentElement === this) {
						if (target !== this.active) this.slideTo(target);
						break;
					}
				}
			},100)
		});
	}
}

// slide
u2Carousel.mode.slide = {
	init:function(){
		//this.addSwipe();
	},
	slideTo:function(target){
        const sliderStyle = getComputedStyle(this);
		const wMode = sliderStyle.getPropertyValue('writing-mode'); // trigger reflow
        const paddingStart = parseFloat(sliderStyle.getPropertyValue('padding-inline-start'));
		const vertical = wMode.includes('vertical');
        const translate = (vertical ? -target.offsetTop : -target.offsetLeft) + paddingStart;
        //const XY = vertical ? 'Y' : 'X';
		//const translate = -(target.offsetLeft - (this.offsetWidth - target.offsetWidth) / 2) - paddingStart;
		//this.slider.style.transform = `translate${XY}(${translate}px)`;
		this.slider.style.transform = `translate3d(${vertical ? 0 : translate}px, ${vertical ? translate : 0}px, 0)`;
		//this.slider.style.transform = 'translateX(-'+(100*this.activeIndex())+'%)'; Advantage: It stays in the right place even when resized.
	},
}
// fade (entirely done by css)
u2Carousel.mode.fade = {
	init:function(){
		this.slider.style.transform = ''; // if changed from mode=slide
	}
}


customElements.define('u2-carousel', u2Carousel)


// slide on target
function hashchange(){
	if (!location.hash) return;
	const el = document.getElementById(location.hash.substring(1));
	if (!el) return;
	const slide = el.closest('u2-carousel > *');
	if (!slide) return;
	const sliderEl = slide.parentElement;
	sliderEl.slideTo(slide);
}
addEventListener('DOMContentLoaded', hashchange);
addEventListener('hashchange', hashchange);
// slide on focus
addEventListener('focusin', e=>{
	const el = document.activeElement;
	const slide = el.closest('u2-carousel > *');
	if (!slide) return;
	const sliderEl = slide.parentElement;
	sliderEl.slideTo(slide);
});
// keyboard nav
addEventListener('keydown', ({target,code})=>{
	if (target.tagName !== 'U2-CAROUSEL') return;
	if (code === 'ArrowRight') target.next();
	if (code === 'ArrowLeft')  target.prev();
});

/* sync */
addEventListener('u2-carousel.slide', e=>{
	const group = e.detail.slider.getAttribute('sync');
	group && document.querySelectorAll('u2-carousel[sync="'+group+'"]').forEach( el => el.slideTo(e.detail.index) );
});
/*  */

/*
u2Carousel.prototype.addSwipe = function(){
	c1.c1Use('pointerObserver',function(){
		const pO = this.pointerObserver = new c1.pointerObserver(this);
		let startX = 0;
		pO.onstart = function(e){
			//e.preventDefault(); // enable drag image, can not select text
			startX = getComputedTranslate(this).x;
			this.style.transform = 'translateX('+startX+'px)';
			this.style.transition = 'none';
		}
		pO.onmove = function(){
			const to = (this.startDiff().x*1) + startX;
			this.style.transform = 'translateX('+to+'px)';
		}
		pO.onstop = function(){
			let x = -getComputedTranslate(this).x;
			const add = this.lastDiff().x * 50;
			add = Math.max(-this.offsetWidth, Math.min(add, this.offsetWidth));
			x -= add;
			let next = Math.round(x / this.offsetWidth);
			next = Math.max(0, Math.min(next, this.children.length-1));
			next = this.children[next];
			if (!next) next = this.active;
			this.style.transition = '';
			this.slideTo(next);
		}
	});
}
function getComputedTranslate(el) {
	const style = getComputedStyle(el);
	const matrix = new (window.WebKitCSSMatrix || window.MSCSSMatrix)(style.transform);
	return {
		x:matrix.m41,
		y:matrix.m42,
	}
}
*/
