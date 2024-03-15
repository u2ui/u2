
const style = document.createElement('style');
style.innerHTML = `
u1-typewriter .-Symbol {
    position:relative;
}
u1-typewriter .-Char { opacity: 0; }
u1-typewriter .-Active .-Char { opacity: 1; }
u1-typewriter .-Caret {
    position:absolute;
    animation: u1-typewriter-caret-ani .5s infinite alternate;
    height:1em;
    width:2px;
    margin:auto;
    top:-.2em;
    bottom:-.2em;
    left: .1em;
    background:currentColor;
}
@keyframes u1-typewriter-caret-ani {
    0% { opacity: 1; }
    25% { opacity: 1; }
    50% { opacity: 0; }
    100% { opacity: 0; }
}
`;
document.head.prepend(style);


class Typewriter extends HTMLElement {
    constructor() {
        super();

        this.innerHTML += '&nbsp;'; // one more char for caret
        separateChars(this);

        this.caretElement = document.createElement('span');
        this.caretElement.classList.add('-Caret');

        this.playInterval = null;
        this.intersectionObserver = new IntersectionObserver((entries)=>{
            entries[0].isIntersecting ? this.play() : this.pause();
        });

    }

    static get observedAttributes() { return ['autoplay', 'loop'] }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'autoplay') this.intersectionObserver[newValue===null?'unobserve':'observe'](this);
    }


    connectedCallback() {
        this.reset();
    }
    disconnectedCallback() {
        this.pause();
    }

    play(){
        this.pause();
        this.dispatchEvent(new CustomEvent('u1-typewriter-play', {bubbles:true}));
        this._playNext();
    }
    _playNext() {
        const speed = getComputedStyle(this).getPropertyValue('--u1-typewriter-speed') || 60;
        this.playInterval = setTimeout(() => {
            this._playNext();
        }, speed);
        if (this.next() === false) {
            this.pause();
            this.dispatchEvent(new CustomEvent('u1-typewriter-end', {bubbles:true}));
            if (this.hasAttribute('loop')) {
                setTimeout(() => {
                    this.reset();
                    this.play();
                }, speed*12 + 1500);
            }
        }
    }
    pause() {
        this.dispatchEvent(new CustomEvent('u1-typewriter-pause', {bubbles:true}));
        clearInterval(this.playInterval);
    }
    next() {
        this.activeChar.classList.add('-Active');
        let next = findNextChar(this, this.activeChar);
        if (!next) {
            return false;
        }
        next.append(this.caretElement)
        return this.activeChar = next;
    }
    reset(){
        this.pause();
        this.querySelectorAll('.-Symbol').forEach(char => char.classList.remove('-Active'));
        let next = findNextChar(this, this);
        this.activeChar = next;
        next.append(this.caretElement)
    }

}
customElements.define('u1-typewriter', Typewriter);


// find the next Char in children or sibling of the node but not outside the root
function findNextChar(root, node) {
    let next = null;
    if (node.classList.contains('-Symbol')) {
        next = node.nextElementSibling;
    } else {
        next = node.firstElementChild || node.nextElementSibling;
    }
    if (!next) {
        while (1) {
            node = node.parentNode;
            if (node === null || node === root) return null;
            next = node.nextElementSibling
            if (next) break;
        }
    }
    if (next.classList.contains('-Symbol')) {
        return next;
    } else {
        return findNextChar(root, next);
    }
}

function separateChars(parent) {
    for (let node of Array.from(parent.childNodes)) {
        if (node.nodeType === 3) {
            let str = node.data;
            //str = str.trim(); // bad for html-formated text
            str = str.replace(/\s+/g, ' ');
            for (let char of str) {
                let span = document.createElement('span');
                span.classList.add('-Symbol');
                span.innerHTML = '<span class=-Char>'+char+'</span>';
                node.parentNode.insertBefore(span, node);
            }
            node.remove();
        } else {
            separateChars(node);
        }
    }
}



/* audio-extension */

document.addEventListener('u1-typewriter-play', (e)=>{
    const el = e.target;
    if (!el.hasAttribute('audio')) return;
    if (!el.audioObj) {
        el.audioObj = new Audio();
        el.audioObj.loop = true;
        el.audioObj.volume = 0.3;
    }
    el.audioObj.src = el.getAttribute('src') || import.meta.url + '/../typewriter.mp3';
    el.audioObj.play();
});
document.addEventListener('u1-typewriter-pause', e=>{
    const el = e.target;
    el.audioObj && el.audioObj.pause();
})