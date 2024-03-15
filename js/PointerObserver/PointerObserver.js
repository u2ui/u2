
const d = document;

export class PointerObserver {
    constructor(el, options) {

        this.options = Object.assign({
            mouse: true,
            touch: true,
            passive: true,
        }, options);

        this.el   = el;
        this.pos  = {};
        this.last = {};
        this.posStart = {};

        this.start = this.start.bind(this);
        this.move = this.move.bind(this);
        this.stop = this.stop.bind(this);


		el.addEventListener('mousedown', this.start);  // why mousedown when only options.touch? To be able to change options after creating the observer?
        el.addEventListener('touchstart', this.start, {passive: this.options.passive});
    }
	start(e) {
		if (this.running) return;
		if (e.type === 'mousedown'  && !this.options.mouse) return;
		if (e.type === 'touchstart' && !this.options.touch) return;
		//if (e.type === 'touchstart') this.touching = true;
		//if (this.touching && e.type === 'mousedown') return;

		let pointer = e;
		if (e.touches) {
			pointer = e.touches[0];
			if (e.touches.length > 1) return; // only the first finger is interesting
			this.identifier = pointer.identifier;
		}


		this.abortCtrl = new AbortController();
		let signal = this.abortCtrl.signal;

		this.posStart = this.pos = {
			x:pointer.pageX,
			y:pointer.pageY
		};

		this.onstart && this.onstart(e);

		if (this.options.mouse) {
            d.addEventListener('mousemove', this.move, {signal});
            d.addEventListener('mouseup'  , this.stop, {signal});
			d.addEventListener('dragstart', this.stop, {signal});
		}
		if (this.options.touch) {
			d.addEventListener('touchmove', this.move, {signal, passive: this.options.passive});
            d.addEventListener('touchend' , this.stop, {signal});
            //d.addEventListener('touchstart', gstart);
		}
		this.running = true;
	}
	move(e) {

		let pointer = e;

		if (e.touches) {
			pointer = e.touches[0];

			// const finger2 = e.touches[1];
			// if (finger2 && this.ongesture) {
			// 	const deltaX = pointer.pageX - finger2.pageX;
			// 	const deltaY = pointer.pageY - finger2.pageY;
			// 	const deg = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
			// 	e.rotate = deg -= this.degStart;
		    //     const dist = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
			// 	e.scale = dist / this.distStart;
			// 	this.ongesture && this.ongesture(e);
			// }

			if (pointer.identifier !== this.identifier) return;
		}

		this.last = this.pos;
		this.pos = {
			x: pointer.pageX,
			y: pointer.pageY,
			time: e.timeStamp,
		};
        if (this.last.x===this.pos.x && this.last.y === this.pos.y) return;

        this.onmove && this.onmove(e);
	}
	stop(e) {
		if (e.changedTouches && e.changedTouches[0].identifier !== this.identifier) return;
		this.onstop && this.onstop(e);
		this.abortCtrl.abort();
		this.running = false;
	}

    get diff() { // should we direct calculate this before onmove? i think .startDiff is almost ever used
        return {
            x: this.pos.x - this.last.x,
            y: this.pos.y - this.last.y,
            time: this.pos.time - this.last.time,
        };
    }
    get startDiff() {
        return {
            x: this.pos.x - this.posStart.x,
            y: this.pos.y - this.posStart.y,
            time: this.pos.time - this.posStart.time,
        };
    }

}


// todo?
// gstart = function(e) {
// 	var pointer = e.touches[0];
// 	var finger2 = e.touches[1];
// 	if (finger2) {
// 		var deltaX = pointer.pageX - finger2.pageX;
// 		var deltaY = pointer.pageY - finger2.pageY;
// 		self.degStart = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
// 		self.distStart = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
// 		self.ongesturestart && self.ongesturestart(e);
// 	}
// },