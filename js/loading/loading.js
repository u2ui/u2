
export function mark(el, opt) {
    if (!el.length) return _markElement(el, opt);
    const dones = Array.from(el).map(el=>_markElement(el, opt));
    return ()=>{ for (let done of dones) done(); }
}

export function done(el) {
    el.loadingTasks--;
    clearTimeout(el.u2ShowLoadingTO);
    if (el.loadingTasks <= 0) {
        el.classList.remove('u2Loading');
        el.removeAttribute('aria-busy');
        el.removeAttribute('inert');
        el.style.cssText = el.u2Loading_oldCssText;
        el.u2Loading_oldCssText = undefined;
    }
}

function _markElement(el, {delay = 0} = {}) {

    el.loadingTasks ??= 0;
    el.loadingTasks++;
    if (el.loadingTasks === 1) { // new, already loading

        const mutationObserver = new MutationObserver(()=>{
            done(el);
            if (el.loadingTasks <= 0) mutationObserver.disconnect();
        });
        mutationObserver.observe(el,{childList:true});
        if (el.tagName === 'IMG') {
            const onload = e=>{
                el.loadingTasks = 1;
                done(el);
            }
            el.addEventListener('load', onload, {once:true});
            el.addEventListener('error', onload, {once:true});
        }


        const root = el.getRootNode();
        if (root.adoptedStyleSheets.indexOf(sheet) === -1) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];

        el.u2Loading_oldCssText = el.style.cssText;
        el.setAttribute('aria-busy', 'true');
        el.setAttribute('inert', '');

        clearTimeout(el.u2ShowLoadingTO);
        el.u2ShowLoadingTO = setTimeout(()=>{
            el.classList.add('u2Loading');
            //if (el.hasAttribute('aria-life')) el.setAttribute('aria-busy','true');
            if (!el.offsetHeight) el.style.minHeight = '36px';
            if (!el.offsetWidth)  el.style.minWidth = '36px';
            let svg = getComputedStyle(el).getPropertyValue('--loading-svg');
            svg = svg.replace('currentColor', getComputedStyle(el).color);
            el.style.setProperty('background-image', svg, 'important');
        },delay);
    }
    return ()=>done(el);
}


const xsvg = `
<svg fill="currentColor" width="64px" height="64px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" xpreserveAspectRatio="xMidYMid">
    <style>
    @keyframes x {
    	from { opacity: 1; scale:1.5; }
    	100%   { opacity: 0; scale:1; }
    }
    g > g {
        transform: rotate(calc(var(--i) * 45deg)) translate(34px, 0);
    }
    circle {
        animation: x 1.4s infinite;
        will-change:opacity,transform;
        animation-delay: calc(var(--i) * .17s);
    }
    </style>
    <g transform="translate(50 50)">
        <g style="--i:0"><circle cx="0" cy="0" r="8"></circle></g>
        <g style="--i:1"><circle cx="0" cy="0" r="8"></circle></g>
        <g style="--i:2"><circle cx="0" cy="0" r="8"></circle></g>
        <g style="--i:3"><circle cx="0" cy="0" r="8"></circle></g>
        <g style="--i:4"><circle cx="0" cy="0" r="8"></circle></g>
        <g style="--i:5"><circle cx="0" cy="0" r="8"></circle></g>
        <g style="--i:6"><circle cx="0" cy="0" r="8"></circle></g>
        <g style="--i:7"><circle cx="0" cy="0" r="8"></circle></g>
    </g>
</svg>`;

const svg = '<svg width="24" height="24" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_V8m1 circle{stroke-linecap:round;animation:spinner_YpZS 1.5s ease-in-out infinite}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}@keyframes spinner_YpZS{0%{stroke-dasharray:0 150;stroke-dashoffset:0}47.5%{stroke-dasharray:42 150;stroke-dashoffset:-16}95%,100%{stroke-dasharray:42 150;stroke-dashoffset:-59}}</style><g class="spinner_V8m1"><circle cx="12" cy="12" r="9.5" fill="none" stroke-width="3"></circle></g></svg>';


const css = `
.u2Loading {
    --loading-svg: url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}");
    background-image: var(--loading-svg) !important;
    background-repeat: no-repeat !important; 
    background-position: 50% !important; 
    background-position-y: min(50%, 10rem) !important;
    background-size: 32px !important; 
    cursor: wait !important; 
    opacity:1;

    &:is(button, span) {
        background-size: 2px !important; 
        background-position:-100% !important; 
        &::after {
            content:"";
            display:inline-block;

            line-height:inherit;
            height:.8lh;
            width:.8lh;
            margin-bottom:.1lh;
            vertical-align: bottom;

            margin-left:.3em;
            background-image:inherit; 
            background-size:contain; 
            background-repeat:no-repeat; 
        }          
    }
    &:is(img) {
        object-position: -10000px -10000px !important;
    }
}
.u2Loading > * {
  opacity:.1;
  cursor: wait !important;
}
`;

const sheet = new CSSStyleSheet();
sheet.replaceSync(css);
