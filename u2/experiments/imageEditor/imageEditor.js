class U2ImageEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._brightness = 0;
        this._contrast = 0;
        this._rotation = 0;
        this._saturation = 0;
        this._flipH = false;
        this._flipV = false;
        this._img = null;
        this._initDOM();
        this._initGL();
    }

    _initDOM() {
        const style = document.createElement('style');
        style.textContent = `
            :host { display: inline-block; position: relative; }
            canvas { width: 100%; xmax-height: 100%; display: block; }
            .checkerboard {
                background: repeating-conic-gradient(
                    #3338 0% 25%, 
                    #ddd8 0% 50%
                ) 0 0/10px 10px;
            }
          `;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'checkerboard';
        this.canvas.width = 600;
        this.canvas.height = 400;
        this.shadowRoot.append(style, this.canvas);
        this.gl = this.canvas.getContext('webgl');
    }

    _initGL() {
        const gl = this.gl;
        const vs = `
        attribute vec2 pos;
        uniform mat3 rot;
        varying vec2 uv;
        void main() {
          vec2 p = (rot * vec3(pos, 1.0)).xy;
          // Fix: Y-Achse flippen für korrektes Bild
          uv = vec2((pos.x + 1.0) * 0.5, 1.0 - (pos.y + 1.0) * 0.5);
          gl_Position = vec4(p, 0, 1);
        }
      `; const fs = `
            precision mediump float;
            uniform sampler2D img;
            uniform float bright;
            uniform float contr;
            uniform float sat;
            uniform vec2 flip; // neu für spiegeln
            varying vec2 uv;
            void main() {
                vec2 coord = vec2(flip.x > 0.5 ? 1.0 - uv.x : uv.x, 
                                flip.y > 0.5 ? 1.0 - uv.y : uv.y);
                vec4 c = texture2D(img, coord);
                c.rgb += bright;
                c.rgb = (c.rgb - 0.5) * contr + 0.5;
                
                // Saturation
                float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                c.rgb = mix(vec3(gray), c.rgb, sat);
                
                gl_FragColor = c;
            }
            `;
        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return s;
        };

        const prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(prog);
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(prog, 'pos');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        this._rotLoc = gl.getUniformLocation(prog, 'rot');
        this._brightLoc = gl.getUniformLocation(prog, 'bright');
        this._contrLoc = gl.getUniformLocation(prog, 'contr');
        this._satLoc = gl.getUniformLocation(prog, 'sat');
        this._flipLoc = gl.getUniformLocation(prog, 'flip');

        gl.uniform1i(gl.getUniformLocation(prog, 'img'), 0);
        this._updateUniforms();
    }

    _updateUniforms() {
        const gl = this.gl;
        const a = (this._rotation * Math.PI) / 180;
        const c = Math.cos(a), s = Math.sin(a);
        gl.uniformMatrix3fv(this._rotLoc, false, [c, s, 0, -s, c, 0, 0, 0, 1]);
        gl.uniform1f(this._brightLoc, this._brightness / 100);
        gl.uniform1f(this._contrLoc, 1 + this._contrast / 100);
        gl.uniform1f(this._satLoc, 1 + this._saturation / 100);
        gl.uniform2f(this._flipLoc, this._flipH ? 1 : 0, this._flipV ? 1 : 0);
    }

    _uploadTexture(img) {
        const gl = this.gl;
        this._tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    }

    _draw() {
        if (!this._tex) return;
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._tex);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    get src() { return this._src; }
    set src(v) {
        this._src = v;
        if (!v) {
            this.canvas.className = 'checkerboard';
            this._tex = null;
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this._img = img;
            // Fix: Rotation NICHT zurücksetzen
            // this._rotation = 0; // <- DIESE ZEILE ENTFERNEN
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.canvas.className = '';
            this._uploadTexture(img);
            this._updateUniforms();
            this._draw();
        };
        img.src = v instanceof Blob ? URL.createObjectURL(v) : v;
    }
    get brightness() { return this._brightness; }
    set brightness(v) {
        this._brightness = Math.max(-100, Math.min(100, v));
        this._updateUniforms();
        this._draw();
    }

    get contrast() { return this._contrast; }
    set contrast(v) {
        this._contrast = Math.max(-100, Math.min(100, v));
        this._updateUniforms();
        this._draw();
    }

    get saturation() { return this._saturation; }
    set saturation(v) {
        this._saturation = Math.max(-100, Math.min(100, v));
        this._updateUniforms();
        this._draw();
    }

    flipHorizontal() {
        this._flipH = !this._flipH;
        this._updateUniforms();
        this._draw();
    }

    flipVertical() {
        this._flipV = !this._flipV;
        this._updateUniforms();
        this._draw();
    }

    rotate() {
        if (!this._img) return;
        this._rotation = (this._rotation + 90) % 360;
        const swap = this._rotation === 90 || this._rotation === 270;
        if (swap) {
            [this.canvas.width, this.canvas.height] = [this.canvas.height, this.canvas.width];
        } else {
            this.canvas.width = this._img.width;
            this.canvas.height = this._img.height;
        }
        this._updateUniforms();
        this._draw();
    }

    crop(rect) {
        // TODO: Implement crop via texture coordinates
    }

    reset() {
        this._brightness = 0;
        this._contrast = 0;
        this._rotation = 0;
        if (this._img) {
            this.canvas.width = this._img.width;
            this.canvas.height = this._img.height;
            this._updateUniforms();
            this._draw();
        }
    }

    async export() {
        return new Promise(res => {
            this.canvas.toBlob(blob => {
                res(new File([blob], 'edited-image.png', { type: 'image/png' }));
            }, 'image/png');
        });
    }

    static get observedAttributes() { return ['src']; }
    attributeChangedCallback(name, old, val) {
        if (name === 'src' && old !== val) this.src = val;
    }
}

makeCroppable();

customElements.define('u2-imageeditor', U2ImageEditor);













// Separate Datei: imageEditor-crop-plugin.js
function makeCroppable() {
    

    const proto = U2ImageEditor.prototype;
    const cropState = new WeakMap();

    const originalInitDOM = proto._initDOM;
    proto._initDOM = function () {

        originalInitDOM.call(this);
        const cropUI = document.createElement('div');
        cropUI.className = 'crop-ui';
        cropUI.innerHTML = `
            <style>
                .crop-ui { 
                    position: absolute; 
                    inset: 0; 
                    pointer-events: none; 
                    display: none; 
                }
                .crop-ui.active { display: block; pointer-events: auto; }
                .crop-box {
                    position: absolute;
                    border: 2px dashed #4a9eff;
                    background: rgba(74, 158, 255, 0.1);
                    cursor: move;
                }
                .crop-handle {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: #4a9eff;
                    border: 2px solid white;
                    border-radius: 50%;
                }
                .crop-handle.nw { top: -5px; left: -5px; cursor: nw-resize; }
                .crop-handle.ne { top: -5px; right: -5px; cursor: ne-resize; }
                .crop-handle.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
                .crop-handle.se { bottom: -5px; right: -5px; cursor: se-resize; }
            </style>
            <div class="crop-box">
                <div class="crop-handle nw"></div>
                <div class="crop-handle ne"></div>
                <div class="crop-handle sw"></div>
                <div class="crop-handle se"></div>
            </div>
        `;
        
        this.shadowRoot.appendChild(cropUI);
        cropState.set(this, { 
            ui: cropUI, 
            box: cropUI.querySelector('.crop-box'),
            dragging: null,
            startX: 0,
            startY: 0,
            startLeft: 0,
            startTop: 0,
            startWidth: 0,
            startHeight: 0
        });
    };

proto.enableCropMode = function (autoCrop = true) {
    const state = cropState.get(this);
    if (!state) return;
    
    state.ui.classList.add('active');
    
    let cropRect = null;
    
    if (autoCrop && this._img) {
        cropRect = this._detectAutoCrop();
    }
    
    if (cropRect) {
        // Auto-detected bounds (in display coordinates)
        const scaleX = this.canvas.offsetWidth / this.canvas.width;
        const scaleY = this.canvas.offsetHeight / this.canvas.height;
        
        state.box.style.left = cropRect.x * scaleX + 'px';
        state.box.style.top = cropRect.y * scaleY + 'px';
        state.box.style.width = cropRect.width * scaleX + 'px';
        state.box.style.height = cropRect.height * scaleY + 'px';
    } else {
        // Default 80% crop
        const w = this.canvas.offsetWidth;
        const h = this.canvas.offsetHeight;
        state.box.style.left = w * 0.1 + 'px';
        state.box.style.top = h * 0.1 + 'px';
        state.box.style.width = w * 0.8 + 'px';
        state.box.style.height = h * 0.8 + 'px';
    }
    
    this._setupCropDrag(state);
};

proto._detectAutoCrop = function (threshold = 10) {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = this._img.width;
    tempCanvas.height = this._img.height;
    ctx.drawImage(this._img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    const w = tempCanvas.width;
    const h = tempCanvas.height;
    
    // Get corner color (average of 4 corners)
    const getPixel = (x, y) => {
        const idx = (y * w + x) * 4;
        return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
    };
    
    const corners = [
        getPixel(0, 0),
        getPixel(w - 1, 0),
        getPixel(0, h - 1),
        getPixel(w - 1, h - 1)
    ];
    
    const refR = Math.round(corners.reduce((sum, c) => sum + c[0], 0) / 4);
    const refG = Math.round(corners.reduce((sum, c) => sum + c[1], 0) / 4);
    const refB = Math.round(corners.reduce((sum, c) => sum + c[2], 0) / 4);
    const refA = Math.round(corners.reduce((sum, c) => sum + c[3], 0) / 4);
    
    const colorMatch = (idx) => {
        return Math.abs(data[idx] - refR) <= threshold &&
               Math.abs(data[idx + 1] - refG) <= threshold &&
               Math.abs(data[idx + 2] - refB) <= threshold &&
               Math.abs(data[idx + 3] - refA) <= threshold;
    };
    
    // Check if ALL pixels in row match (100%)
    const isRowBorder = (y) => {
        for (let x = 0; x < w; x++) {
            if (!colorMatch((y * w + x) * 4)) return false;
        }
        return true;
    };
    
    // Check if ALL pixels in column match (100%)
    const isColBorder = (x) => {
        for (let y = 0; y < h; y++) {
            if (!colorMatch((y * w + x) * 4)) return false;
        }
        return true;
    };
    
    // Find top boundary (first row with content)
    let top = 0;
    for (let y = 0; y < h; y++) {
        if (!isRowBorder(y)) {
            top = y;
            break;
        }
    }
    
    // Find bottom boundary (last row with content + 1)
    let bottom = h;
    for (let y = h - 1; y >= top; y--) {
        if (!isRowBorder(y)) {
            bottom = y + 1;
            break;
        }
    }
    
    // Find left boundary (first column with content)
    let left = 0;
    for (let x = 0; x < w; x++) {
        if (!isColBorder(x)) {
            left = x;
            break;
        }
    }
    
    // Find right boundary (last column with content + 1)
    let right = w;
    for (let x = w - 1; x >= left; x--) {
        if (!isColBorder(x)) {
            right = x + 1;
            break;
        }
    }
    
    const cropWidth = right - left;
    const cropHeight = bottom - top;
    
    // Only crop if at least 2% would be removed
    if (cropWidth < w * 0.98 || cropHeight < h * 0.98) {
        return { x: left, y: top, width: cropWidth, height: cropHeight };
    }
    
    return null;
};

    proto.disableCropMode = function () {
        const state = cropState.get(this);
        if (!state) return;
        state.ui.classList.remove('active');
    };

    proto.applyCrop = function () {
        const state = cropState.get(this);
        if (!state) return;
        
        const box = state.box;
        const scaleX = this.canvas.width / this.canvas.offsetWidth;
        const scaleY = this.canvas.height / this.canvas.offsetHeight;
        
        const rect = {
            x: parseInt(box.style.left) * scaleX,
            y: parseInt(box.style.top) * scaleY,
            width: parseInt(box.style.width) * scaleX,
            height: parseInt(box.style.height) * scaleY
        };
        
        this.crop(rect);
        this.disableCropMode();
    };

    proto._setupCropDrag = function (state) {
        const box = state.box;
        const handles = box.querySelectorAll('.crop-handle');
        
        const onMouseDown = (e, type) => {
            e.preventDefault();
            e.stopPropagation();
            
            state.dragging = type;
            state.startX = e.clientX;
            state.startY = e.clientY;
            state.startLeft = parseInt(box.style.left);
            state.startTop = parseInt(box.style.top);
            state.startWidth = parseInt(box.style.width);
            state.startHeight = parseInt(box.style.height);
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        
        const onMouseMove = (e) => {
            if (!state.dragging) return;
            
            const dx = e.clientX - state.startX;
            const dy = e.clientY - state.startY;
            
            const maxW = this.canvas.offsetWidth;
            const maxH = this.canvas.offsetHeight;
            
            if (state.dragging === 'box') {
                // Move box
                let newLeft = state.startLeft + dx;
                let newTop = state.startTop + dy;
                
                newLeft = Math.max(0, Math.min(newLeft, maxW - state.startWidth));
                newTop = Math.max(0, Math.min(newTop, maxH - state.startHeight));
                
                box.style.left = newLeft + 'px';
                box.style.top = newTop + 'px';
                
            } else {
                // Resize via handle
                let newLeft = state.startLeft;
                let newTop = state.startTop;
                let newWidth = state.startWidth;
                let newHeight = state.startHeight;
                
                if (state.dragging.includes('n')) {
                    newTop = Math.max(0, Math.min(state.startTop + dy, state.startTop + state.startHeight - 20));
                    newHeight = state.startHeight - (newTop - state.startTop);
                }
                if (state.dragging.includes('s')) {
                    newHeight = Math.max(20, Math.min(state.startHeight + dy, maxH - state.startTop));
                }
                if (state.dragging.includes('w')) {
                    newLeft = Math.max(0, Math.min(state.startLeft + dx, state.startLeft + state.startWidth - 20));
                    newWidth = state.startWidth - (newLeft - state.startLeft);
                }
                if (state.dragging.includes('e')) {
                    newWidth = Math.max(20, Math.min(state.startWidth + dx, maxW - state.startLeft));
                }
                
                box.style.left = newLeft + 'px';
                box.style.top = newTop + 'px';
                box.style.width = newWidth + 'px';
                box.style.height = newHeight + 'px';
            }
        };
        
        const onMouseUp = () => {
            state.dragging = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        // Box dragging
        box.addEventListener('mousedown', (e) => {
            if (e.target === box) {
                onMouseDown(e, 'box');
            }
        });
        
        // Handle dragging
        handles.forEach(handle => {
            const type = handle.className.split(' ')[1]; // nw, ne, sw, se
            handle.addEventListener('mousedown', (e) => onMouseDown(e, type));
        });
    };
};