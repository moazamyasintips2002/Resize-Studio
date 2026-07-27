/**
 * OmniScan Studio - Core Tools & Image Processing Engine
 * Provides client-side algorithms for scanning, cleaning, resizing,
 * background removal, spot erasing, color enhancement, and file compression.
 */

window.OmniTools = {

    /**
     * Reads a File or Blob into an HTMLImageElement
     */
    loadImageFromFile: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Converts a DataURL into a Blob object
     */
    dataURLtoBlob: function(dataurl) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    },

    /**
     * Formats bytes to human-readable string (KB, MB)
     */
    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Scanner Filter Presets (Magic color, B&W, Grayscale)
     */
    applyScanFilter: function(canvas, presetName) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            if (presetName === 'bw') {
                // High contrast Black and White
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                const v = gray > 128 ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = v;
            } else if (presetName === 'grayscale') {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                data[i] = data[i + 1] = data[i + 2] = gray;
            } else if (presetName === 'magic') {
                // Boost text contrast & whiten paper background
                let gray = 0.299 * r + 0.587 * g + 0.114 * b;
                if (gray > 160) {
                    r = Math.min(255, r * 1.15 + 20);
                    g = Math.min(255, g * 1.15 + 20);
                    b = Math.min(255, b * 1.15 + 20);
                } else {
                    r = Math.max(0, r * 0.85 - 10);
                    g = Math.max(0, g * 0.85 - 10);
                    b = Math.max(0, b * 0.85 - 10);
                }
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Document Cleaner Algorithms (Whiteboard, Handwritten Notes, Thermal Receipt)
     */
    cleanDocument: function(canvas, mode, threshold = 128, shadowSuppression = 50) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const w = canvas.width;
        const h = canvas.height;

        const shadowFactor = shadowSuppression / 100;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            let lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (mode === 'binarize') {
                const v = lum > threshold ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = v;
            } else if (mode === 'whiteboard') {
                // Eliminate grey shadows, brighten board white, darken markers
                if (lum > threshold - 20) {
                    data[i] = data[i + 1] = data[i + 2] = 255;
                } else {
                    data[i] = Math.max(0, r * (1 - shadowFactor * 0.3));
                    data[i + 1] = Math.max(0, g * (1 - shadowFactor * 0.3));
                    data[i + 2] = Math.max(0, b * (1 - shadowFactor * 0.3));
                }
            } else if (mode === 'notes') {
                // Clean yellow paper tint, darken pen ink
                let norm = lum + (255 - lum) * shadowFactor * 0.6;
                if (norm > threshold) {
                    data[i] = data[i + 1] = data[i + 2] = 255;
                } else {
                    data[i] = Math.max(0, r * 0.6);
                    data[i + 1] = Math.max(0, g * 0.6);
                    data[i + 2] = Math.max(0, b * 0.6);
                }
            } else if (mode === 'receipt') {
                // High contrast thermal receipt cleaner
                const v = lum > (threshold - 10) ? 255 : Math.max(0, lum - 40);
                data[i] = data[i + 1] = data[i + 2] = v;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Photo Enhancer Adjustments (Brightness, Contrast, Saturation, Sharpness)
     */
    enhancePhoto: function(sourceImg, canvas, opts) {
        canvas.width = sourceImg.naturalWidth || sourceImg.width;
        canvas.height = sourceImg.naturalHeight || sourceImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceImg, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const bright = parseInt(opts.brightness || 0);
        const contrast = parseInt(opts.contrast || 0);
        const sat = parseInt(opts.saturation || 0);

        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i] + bright;
            let g = data[i + 1] + bright;
            let b = data[i + 2] + bright;

            // Apply Contrast
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;

            // Apply Saturation
            if (sat !== 0) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                const satFactor = (sat + 100) / 100;
                r = gray + (r - gray) * satFactor;
                g = gray + (g - gray) * satFactor;
                b = gray + (b - gray) * satFactor;
            }

            data[i] = Math.min(255, Math.max(0, r));
            data[i + 1] = Math.min(255, Math.max(0, g));
            data[i + 2] = Math.min(255, Math.max(0, b));
        }

        ctx.putImageData(imgData, 0, 0);

        // Apply Sharpness Kernel if requested
        if (opts.sharpness > 0) {
            this.applySharpness(canvas, opts.sharpness / 100);
        }
    },

    /**
     * Convolution Sharpening Filter
     */
    applySharpness: function(canvas, mix = 0.5) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const src = ctx.getImageData(0, 0, w, h);
        const srcData = src.data;
        const output = ctx.createImageData(w, h);
        const dstData = output.data;

        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const dstOff = (y * w + x) * 4;
                let r = 0, g = 0, b = 0;

                for (let cy = -1; cy <= 1; cy++) {
                    for (let cx = -1; cx <= 1; cx++) {
                        const k = kernel[(cy + 1) * 3 + (cx + 1)];
                        const srcOff = ((y + cy) * w + (x + cx)) * 4;
                        r += srcData[srcOff] * k;
                        g += srcData[srcOff + 1] * k;
                        b += srcData[srcOff + 2] * k;
                    }
                }

                const origOff = (y * w + x) * 4;
                dstData[dstOff] = srcData[origOff] * (1 - mix) + r * mix;
                dstData[dstOff + 1] = srcData[origOff + 1] * (1 - mix) + g * mix;
                dstData[dstOff + 2] = srcData[origOff + 2] * (1 - mix) + b * mix;
                dstData[dstOff + 3] = srcData[origOff + 3];
            }
        }
        ctx.putImageData(output, 0, 0);
    },

    /**
     * Spot Eraser / Blemish Remover Brush
     * Blends surrounding pixel neighborhood into target circle
     */
    eraseSpot: function(canvas, x, y, radius) {
        const ctx = canvas.getContext('2d');
        const startX = Math.max(0, Math.floor(x - radius));
        const startY = Math.max(0, Math.floor(y - radius));
        const endX = Math.min(canvas.width, Math.ceil(x + radius));
        const endY = Math.min(canvas.height, Math.ceil(y + radius));

        // Sample border ring color around the spot
        let avgR = 0, avgG = 0, avgB = 0, count = 0;
        const borderR = radius + 3;

        for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
            const bx = Math.round(x + Math.cos(angle) * borderR);
            const by = Math.round(y + Math.sin(angle) * borderR);
            if (bx >= 0 && bx < canvas.width && by >= 0 && by < canvas.height) {
                const p = ctx.getImageData(bx, by, 1, 1).data;
                avgR += p[0];
                avgG += p[1];
                avgB += p[2];
                count++;
            }
        }

        if (count > 0) {
            avgR = Math.round(avgR / count);
            avgG = Math.round(avgG / count);
            avgB = Math.round(avgB / count);

            const imgData = ctx.getImageData(startX, startY, endX - startX, endY - startY);
            const data = imgData.data;

            for (let py = startY; py < endY; py++) {
                for (let px = startX; px < endX; px++) {
                    const dist = Math.sqrt((px - x) * (px - x) + (py - y) * (py - y));
                    if (dist <= radius) {
                        const idx = ((py - startY) * (endX - startX) + (px - startX)) * 4;
                        const factor = Math.cos((dist / radius) * (Math.PI / 2));
                        data[idx] = Math.round(data[idx] * (1 - factor) + avgR * factor);
                        data[idx + 1] = Math.round(data[idx + 1] * (1 - factor) + avgG * factor);
                        data[idx + 2] = Math.round(data[idx + 2] * (1 - factor) + avgB * factor);
                    }
                }
            }
            ctx.putImageData(imgData, startX, startY);
        }
    },

    /**
     * Photo Background Remover & Solid Color Replacer Engine
     * Uses corner sampling & color distance keying to isolate background
     */
    removeBackground: function(canvas, tolerancePercent = 35, fillColor = 'transparent') {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample 4 corners to estimate primary background color
        const corners = [
            0, // Top-left
            (w - 1) * 4, // Top-right
            ((h - 1) * w) * 4, // Bottom-left
            ((h - 1) * w + (w - 1)) * 4 // Bottom-right
        ];

        let bgR = 0, bgG = 0, bgB = 0;
        corners.forEach(idx => {
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
        });
        bgR /= 4; bgG /= 4; bgB /= 4;

        const maxDist = Math.sqrt(255 * 255 * 3);
        const threshold = (tolerancePercent / 100) * maxDist;

        // Parse Fill Color
        let fillR = 0, fillG = 0, fillB = 0, fillAlpha = 0;
        if (fillColor !== 'transparent') {
            fillAlpha = 255;
            const temp = document.createElement('canvas');
            temp.width = temp.height = 1;
            const tCtx = temp.getContext('2d');
            tCtx.fillStyle = fillColor;
            tCtx.fillRect(0, 0, 1, 1);
            const p = tCtx.getImageData(0, 0, 1, 1).data;
            fillR = p[0]; fillG = p[1]; fillB = p[2];
        }

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

            if (dist <= threshold) {
                if (fillColor === 'transparent') {
                    data[i + 3] = 0; // Alpha transparent
                } else {
                    data[i] = fillR;
                    data[i + 1] = fillG;
                    data[i + 2] = fillB;
                    data[i + 3] = 255;
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
    },

    /**
     * File Size Reducer & Compression Algorithm
     * Binary searches target quality / canvas downscaling to hit exact KB target (e.g. 20KB, 50KB, 100KB)
     */
    compressImageToTargetKB: async function(sourceImg, targetKB, mimeType = 'image/jpeg') {
        let quality = 0.9;
        let scale = 1.0;
        const targetBytes = targetKB * 1024;

        const canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        let currentDataUrl = '';
        let currentBlob = null;

        for (let attempt = 0; attempt < 12; attempt++) {
            canvas.width = Math.round((sourceImg.naturalWidth || sourceImg.width) * scale);
            canvas.height = Math.round((sourceImg.naturalHeight || sourceImg.height) * scale);
            ctx = canvas.getContext('2d');
            ctx.drawImage(sourceImg, 0, 0, canvas.width, canvas.height);

            currentDataUrl = canvas.toDataURL(mimeType, quality);
            currentBlob = this.dataURLtoBlob(currentDataUrl);

            if (currentBlob.size <= targetBytes) {
                break;
            }

            if (quality > 0.2) {
                quality -= 0.15;
            } else {
                scale *= 0.85;
            }
        }

        return {
            dataUrl: currentDataUrl,
            blob: currentBlob,
            size: currentBlob.size,
            width: canvas.width,
            height: canvas.height
        };
    }
};
