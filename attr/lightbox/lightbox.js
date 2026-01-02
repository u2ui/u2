// lightbox.js
import "../../u2/u2.js";

const overlay = document.createElement('div');
overlay.popover = 'auto'; // Close on ESC
overlay.classList.add('u2LightboxContainer');

overlay.innerHTML = `
    <style>
        .u2LightboxContainer {
            margin: 0;
            padding: 0;
            border: none;
            inset: 0;
            width: 100vw;
            height: 100vh;
            align-items: center;
            justify-content: center;
            color: var(--color-lightest, #fff);
            background: color-mix(in srgb, var(--color-darkest, #000), transparent 10%);
            transition-duration: .4s;
            --u2-ico-dir: var(--u2-ico-dir-material);

            &:popover-open { display: flex; }
            & u2-carousel {
                width:100%;
                height:93%;
            }
            & u2-carousel > img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            & .-toolbar {
                position: absolute;
                inset: var(--gap, 1rem);
                bottom: auto;
                display: flex;
                gap: var(--gap, 1rem);
                justify-content: end;
                z-index: 1;
                & button {
                    background: #0000;
                    border: none;
                    padding:0;
                    margin:0;
                    color: inherit;
                }
            }
        }
    </style>
    <div class=-toolbar>
        <button class=-close aria-label="Close">
            <u2-ico icon=close>×</u2-ico>
        </button>
    </div>
    <u2-carousel mode=fade></u2-carousel>
`;

document.body.append(overlay);


const carousel = overlay.querySelector('u2-carousel');

overlay.addEventListener('click', e => e.target === overlay && overlay.hidePopover() );
overlay.querySelector('.-close').addEventListener('click', ()=>overlay.hidePopover());

document.addEventListener('click', e => {
    const el = e.target.closest('a[u2-lightbox]');
    if (!el) return;
    
    const groupName = el.getAttribute('u2-lightbox');
    const src = el.href;
    const group = groupName 
        ? [...document.querySelectorAll(`a[u2-lightbox="${groupName}"]`)].map(a => a.href)
        : [src];
    
    carousel.innerHTML = `
        <svg slot=prev fill="currentColor" viewBox="0 0 48 48" width=40 style="transform:rotate(180deg)">
            <path d="M4 24c0-.69.56-1.25 1.25-1.25H37.7l-12.83-12.6a1.25 1.25 0 1 1 1.76-1.8L41.6 23.1l.03.02a1.25 1.25 0 0 1-.04 1.8L26.63 39.64a1.25 1.25 0 1 1-1.76-1.78L37.7 25.25H5.25C4.56 25.25 4 24.69 4 24z"></path>
        </svg>
        <svg slot=next fill="currentColor" viewBox="0 0 48 48" width=40>
            <path d="M4 24c0-.69.56-1.25 1.25-1.25H37.7l-12.83-12.6a1.25 1.25 0 1 1 1.76-1.8L41.6 23.1l.03.02a1.25 1.25 0 0 1-.04 1.8L26.63 39.64a1.25 1.25 0 1 1-1.76-1.78L37.7 25.25H5.25C4.56 25.25 4 24.69 4 24z"></path>
        </svg>`;

    group.forEach(imgSrc => {
        const img = document.createElement('img');
        img.dataset.src = imgSrc;
        img.alt = '';
        carousel.append(img);
    });
  
    overlay.showPopover();

    Promise.all([
        u2.js('loading'),
        u2.el('carousel')
    ]).then(([loading])=>{ 

        const load = (el)=>{
            if (!el || el.slot || el.src) return;
            loading.mark(el);
            el.src = el.dataset.src;
        }

        carousel.addEventListener('u2-carousel.slide', ({detail})=>{
            load(detail.slide);
            setTimeout(()=>{ // requestIdleCallback??
                load(detail.slide.nextElementSibling);
                load(detail.slide.previousElementSibling);
            },200)
        });
        carousel.slideTo(group.indexOf(src));
        carousel.tabIndex = -1;
        carousel.focus();
        u2.el('ico');
    });
  
  e.preventDefault();
});