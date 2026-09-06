(() => {
    if (window.__bondsMallLogoCycleStarted) return;
    window.__bondsMallLogoCycleStarted = true;

    const sequence = ['text', 'black', 'text', 'gold'];
    const duration = 10000;

    function stripFlatPhotoBackground(img) {
        if (!img || img.dataset.bgStripped === '1') return;
        const process = () => {
            if (img.dataset.bgStripped === '1' || !img.naturalWidth || !img.naturalHeight) return;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return;
                ctx.drawImage(img, 0, 0);

                const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = image.data;
                const w = canvas.width;
                const h = canvas.height;
                const samples = [];
                const samplePoints = [
                    [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
                    [Math.floor(w / 2), 0], [Math.floor(w / 2), h - 1],
                    [0, Math.floor(h / 2)], [w - 1, Math.floor(h / 2)]
                ];
                samplePoints.forEach(([x, y]) => {
                    const i = (y * w + x) * 4;
                    samples.push([data[i], data[i + 1], data[i + 2]]);
                });

                const bg = samples.reduce((sum, rgb) => [
                    sum[0] + rgb[0], sum[1] + rgb[1], sum[2] + rgb[2]
                ], [0, 0, 0]).map(v => v / samples.length);

                const distance = (i) => {
                    const dr = data[i] - bg[0];
                    const dg = data[i + 1] - bg[1];
                    const db = data[i + 2] - bg[2];
                    return Math.sqrt(dr * dr + dg * dg + db * db);
                };

                const visited = new Uint8Array(w * h);
                const queue = new Int32Array(w * h);
                let head = 0;
                let tail = 0;
                const tolerance = 72;
                const softTolerance = 100;

                const enqueue = (x, y) => {
                    if (x < 0 || x >= w || y < 0 || y >= h) return;
                    const p = y * w + x;
                    if (visited[p]) return;
                    const i = p * 4;
                    if (data[i + 3] === 0 || distance(i) <= tolerance) {
                        visited[p] = 1;
                        queue[tail++] = p;
                    }
                };

                for (let x = 0; x < w; x++) {
                    enqueue(x, 0);
                    enqueue(x, h - 1);
                }
                for (let y = 0; y < h; y++) {
                    enqueue(0, y);
                    enqueue(w - 1, y);
                }

                while (head < tail) {
                    const p = queue[head++];
                    const x = p % w;
                    const y = Math.floor(p / w);
                    const i = p * 4;
                    data[i + 3] = 0;
                    enqueue(x - 1, y);
                    enqueue(x + 1, y);
                    enqueue(x, y - 1);
                    enqueue(x, y + 1);
                }

                // Soften only the remaining edge pixels that are close to the sampled background.
                for (let p = 0; p < w * h; p++) {
                    if (visited[p]) continue;
                    const i = p * 4;
                    const d = distance(i);
                    if (d < softTolerance) {
                        data[i + 3] = Math.min(data[i + 3], Math.round(((d - tolerance) / (softTolerance - tolerance)) * 255));
                    }
                }

                ctx.putImageData(image, 0, 0);
                img.src = canvas.toDataURL('image/png');
                img.dataset.bgStripped = '1';
            } catch (error) {
                // If a browser blocks canvas pixel access, leave the original logo intact.
                console.warn('Bonds Mall logo background removal skipped:', error);
            }
        };

        if (img.complete) process();
        else img.addEventListener('load', process, { once: true });
    }

    function stripLogoPhotoBackgrounds() {
        document.querySelectorAll('.logo .logo-img').forEach(stripFlatPhotoBackground);
    }

    function triggerTextGleam() {
        document.querySelectorAll('.logo').forEach((logoContainer) => {
            if (!logoContainer.querySelector('.logo-text')) return;
            const overlay = document.createElement('div');
            overlay.className = 'logo-gleam-overlay';
            const sweep = document.createElement('span');
            sweep.className = 'logo-gleam-sweep';
            overlay.appendChild(sweep);
            logoContainer.appendChild(overlay);
            window.setTimeout(() => overlay.remove(), 2800);
        });
    }

    function applyFace(faceName) {
        stripLogoPhotoBackgrounds();
        document.querySelectorAll('.logo').forEach((logoContainer) => {
            const faces = {
                text: logoContainer.querySelector('.logo-text'),
                black: logoContainer.querySelector('.logo-img--black'),
                gold: logoContainer.querySelector('.logo-img--gold')
            };
            Object.entries(faces).forEach(([name, face]) => {
                if (face) face.classList.toggle('logo-face--active', name === faceName);
            });
        });
        if (faceName === 'text') triggerTextGleam();
    }

    let index = 0;
    function advance() {
        index = (index + 1) % sequence.length;
        applyFace(sequence[index]);
        window.setTimeout(advance, duration);
    }

    function start() {
        stripLogoPhotoBackgrounds();
        applyFace('text');
        window.setTimeout(advance, duration);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
