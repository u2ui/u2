
var style = document.createElement('style');
style.innerHTML = `
u1-carousel-nav {
	display:flex;
	justify-content:center;
	margin:.5rem;
}
u1-carousel-nav > * {
	xflex:0 0 auto;
	width:1.2rem;
	height:1.2rem;
	margin:.2rem;
	border-radius:100%;
	background-color:#0003;
	cursor:pointer;

	display:flex;
	font-size:.5rem;
	padding-bottom:.035rem;
	color:transparent;
	justify-content:center;
	align-items:center;
	opacity:.3;
}
u1-carousel-nav > :hover {
	opacity:.6;
}
u1-carousel-nav > .-active {
	opacity:1;
}
`
document.head.prepend(style);

function refSlideshows(el) {
	var grp = el.getAttribute('sync-group');
	if (grp) {
		var slides = [];
		document.body.c1FindAll('u1-carousel[sync-group="'+grp+'"]').forEach(function(ssEl){
			slides.push(ssEl);
		});
		return slides;
	} else {
		return [el.parentNode.querySelector('u1-carousel')];
	}
}

class u1CarouselNav extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		customElements.whenDefined('u1-carousel').then(()=>{
			var SS = refSlideshows(this)[0];

			var items = SS._items();

			if (items.length < 2) this.style.display = 'none';

			items.forEach((item, index)=>{
				var button = document.createElement('span');
				button.addEventListener('click',()=>SS.slideTo(index));
				button.innerHTML = index+1;
				this.append(button);
			});
			SS.addEventListener('u1-carousel.slide', e=>{
				Array.from(this.children).forEach((button, index)=>{
					button.classList.toggle('-active', e.detail.index === index);
				});
			});
		})
	}
}
customElements.define('u1-carousel-nav', u1CarouselNav)
