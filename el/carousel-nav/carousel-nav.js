
const style = document.createElement('style');
style.innerHTML = `
u2-carousel-nav {
	display:flex;
	justify-content:center;
	margin:.5rem;
	gap:.5rem;
}
u2-carousel-nav > * {
	width:1.2rem;
	height:1.2rem;
	border-radius:99rem;
	background-color:#0003;
	cursor:pointer;

	display:flex;
	font-size:.5rem;
	padding-block-end:.035rem;
	color:transparent;
	justify-content:center;
	align-items:center;
	opacity:.3;
}
u2-carousel-nav > :hover {
	opacity:.6;
}
u2-carousel-nav > .-active {
	opacity:1;
}
`
document.head.prepend(style);

function refSlideshows(el) {
	const grp = el.getAttribute('sync-group');
	if (grp) {
		const slides = [];
		document.body.c1FindAll('u2-carousel[sync-group="'+grp+'"]').forEach(function(ssEl){
			slides.push(ssEl);
		});
		return slides;
	} else {
		return [el.parentNode.querySelector('u2-carousel')];
	}
}

class u2CarouselNav extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		customElements.whenDefined('u2-carousel').then(()=>{
			const SS = refSlideshows(this)[0];

			const items = SS._items();

			if (items.length < 2) this.style.display = 'none';

			items.forEach((item, index)=>{
				const button = document.createElement('span');
				button.addEventListener('click',()=>SS.slideTo(index));
				button.innerHTML = index+1;
				this.append(button);
			});
			SS.addEventListener('u2-carousel.slide', e=>{
				Array.from(this.children).forEach((button, index)=>{
					button.classList.toggle('-active', e.detail.index === index);
				});
			});
		})
	}
}
customElements.define('u2-carousel-nav', u2CarouselNav)
