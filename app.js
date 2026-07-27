/**
 * OmniScan Studio - Main Application Controller
 * Handles tab navigation, UI state, Cropper.js integrations, Webcam stream,
 * Document Cleaner, Resizer, Enhancer, Converter, Compressor & OmniCloud Storage.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // STATE MANAGEMENT & GLOBAL VARIABLES
    // ==========================================
    let currentTab = 'resizer';
    let cropperInstance = null;
    let cameraStream = null;
    let batchPages = []; // Multi-page PDF queue

    // Tool Canvas States
    let scannerImageObj = null;
    let cleanerImageObj = null;
    let resizerImageObj = null;
    let enhancerImageObj = null;
    let bgImageObj = null;
    let compressorImageObj = null;

    // Enhancer Tool State
    let enhancerMode = 'adjust'; // 'adjust' | 'eraser'
    let isDrawingSpot = false;

    // OmniCloud Storage Key
    const STORAGE_KEY = 'omniscan_cloud_files_v1';

    // ==========================================
    // TAB NAVIGATION & THEME SWITCHING
    // ==========================================
    window.switchTab = function(tabId) {
        currentTab = tabId;
        
        // Update Sidebar Tab Buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Toggle Content Sections
        document.querySelectorAll('.tab-content').forEach(section => {
            if (section.id === `tab-${tabId}`) {
                section.classList.remove('hidden');
                section.classList.add('block');
            } else {
                section.classList.add('hidden');
                section.classList.remove('block');
            }
        });

        // Close camera stream if open when leaving scanner tab
        if (tabId !== 'scanner' && cameraStream) {
            closeCamera();
        }

        // Refresh icons
        if (window.lucide) window.lucide.createIcons();
    };

    // Theme Switcher (Dark / Light)
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn?.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
    });

    // Mobile Navigation Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    mobileMenuBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
    });

    // Global Drag & Drop Handling
    const globalDropzone = document.getElementById('globalDropzone');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        globalDropzone?.classList.remove('hidden');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            globalDropzone?.classList.add('hidden');
        }
    });

    window.addEventListener('dragover', (e) => e.preventDefault());

    window.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragCounter = 0;
        globalDropzone?.classList.add('hidden');

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            handleGlobalFileInput(file);
        }
    });

    function handleGlobalFileInput(file) {
        if (!file.type.startsWith('image/') && !file.name.endsWith('.pdf')) return;

        if (currentTab === 'scanner') {
            loadScannerFile(file);
        } else if (currentTab === 'cleaner') {
            loadCleanerFile(file);
        } else if (currentTab === 'resizer') {
            loadResizerFile(file);
        } else if (currentTab === 'enhancer') {
            loadEnhancerFile(file);
        } else if (currentTab === 'bgremover') {
            loadBgFile(file);
        } else if (currentTab === 'compressor') {
            loadCompressorFile(file);
        } else if (currentTab === 'converter') {
            document.getElementById('converterInputFile').files = createFileList([file]);
            updateConverterFileName(file);
        }
    }

    function createFileList(files) {
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        return dt.files;
    }


    // ==========================================
    // 1. DOCUMENT SCANNER & CAMERA CONTROLLER
    // ==========================================
    const scannerFileInput = document.getElementById('scannerFileInput');
    const scannerWorkspace = document.getElementById('scannerWorkspace');
    const scannerEmptyState = document.getElementById('scannerEmptyState');
    const scannerCropperImg = document.getElementById('scannerCropperImg');

    scannerFileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            loadScannerFile(e.target.files[0]);
        }
    });

    async function loadScannerFile(file) {
        try {
            scannerImageObj = await OmniTools.loadImageFromFile(file);
            scannerCropperImg.src = scannerImageObj.src;
            
            scannerEmptyState.classList.add('hidden');
            scannerWorkspace.classList.remove('hidden');

            if (cropperInstance) cropperInstance.destroy();
            cropperInstance = new Cropper(scannerCropperImg, {
                viewMode: 1,
                autoCropArea: 0.95,
                responsive: true,
                background: true
            });
        } catch (err) {
            alert('Failed to load image file.');
        }
    }

    // Camera Stream Handling
    const openCameraBtn = document.getElementById('openCameraBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');
    const captureCameraBtn = document.getElementById('captureCameraBtn');
    const cameraContainer = document.getElementById('cameraContainer');
    const webcamVideo = document.getElementById('webcamVideo');

    openCameraBtn?.addEventListener('click', async () => {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            webcamVideo.srcObject = cameraStream;
            cameraContainer.classList.remove('hidden');
        } catch (err) {
            alert('Camera access denied or unavailable on this device.');
        }
    });

    function closeCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraContainer.classList.add('hidden');
    }

    closeCameraBtn?.addEventListener('click', closeCamera);

    captureCameraBtn?.addEventListener('click', () => {
        const webcamCanvas = document.getElementById('webcamCanvas');
        webcamCanvas.width = webcamVideo.videoWidth || 1280;
        webcamCanvas.height = webcamVideo.videoHeight || 720;
        const ctx = webcamCanvas.getContext('2d');
        ctx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
        
        const dataUrl = webcamCanvas.toDataURL('image/jpeg', 0.95);
        closeCamera();

        const blob = OmniTools.dataURLtoBlob(dataUrl);
        const file = new File([blob], 'camera_scan.jpg', { type: 'image/jpeg' });
        loadScannerFile(file);
    });

    // Rotate Controls
    document.getElementById('scannerRotateLeft')?.addEventListener('click', () => {
        if (cropperInstance) cropperInstance.rotate(-90);
    });
    document.getElementById('scannerRotateRight')?.addEventListener('click', () => {
        if (cropperInstance) cropperInstance.rotate(90);
    });

    // Preset Scan Filters
    window.applyScannerPreset = function(presetName) {
        if (!cropperInstance) return;
        const croppedCanvas = cropperInstance.getCroppedCanvas();
        if (!croppedCanvas) return;

        OmniTools.applyScanFilter(croppedCanvas, presetName);
        
        // Re-replace image preview
        cropperInstance.replace(croppedCanvas.toDataURL('image/jpeg'));
    };

    // Add Page to Multi-Page PDF Batch
    document.getElementById('addPageToDocBtn')?.addEventListener('click', () => {
        if (!cropperInstance) return;
        const canvas = cropperInstance.getCroppedCanvas();
        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        batchPages.push(dataUrl);
        updateBatchCarousel();
    });

    function updateBatchCarousel() {
        const batchContainer = document.getElementById('batchContainer');
        const batchThumbnails = document.getElementById('batchThumbnails');
        const batchCountText = document.getElementById('batchCountText');

        if (batchPages.length === 0) {
            batchContainer.classList.add('hidden');
            return;
        }

        batchContainer.classList.remove('hidden');
        batchCountText.textContent = batchPages.length;
        batchThumbnails.innerHTML = '';

        batchPages.forEach((dataUrl, idx) => {
            const thumbDiv = document.createElement('div');
            thumbDiv.className = 'relative shrink-0 w-20 h-24 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 group';
            thumbDiv.innerHTML = `
                <img src="${dataUrl}" class="w-full h-full object-cover">
                <span class="absolute bottom-1 left-1 bg-slate-900/80 text-[10px] text-white px-1.5 py-0.5 rounded font-bold">${idx + 1}</span>
                <button onclick="removeBatchPage(${idx})" class="absolute top-1 right-1 bg-rose-600/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            `;
            batchThumbnails.appendChild(thumbDiv);
        });
        if (window.lucide) window.lucide.createIcons();
    }

    window.removeBatchPage = function(index) {
        batchPages.splice(index, 1);
        updateBatchCarousel();
    };

    document.getElementById('clearBatchBtn')?.addEventListener('click', () => {
        batchPages = [];
        updateBatchCarousel();
    });

    // Download / Export PDF or Image
    document.getElementById('saveScanDownloadBtn')?.addEventListener('click', () => {
        if (!cropperInstance) return;
        const canvas = cropperInstance.getCroppedCanvas();
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `scan_${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.92);
        link.click();

        // Save to Cloud Drive
        saveFileToCloud(`scan_${Date.now()}.jpg`, link.href, 'image/jpeg');
    });

    document.getElementById('exportBatchPdfBtn')?.addEventListener('click', () => {
        if (batchPages.length === 0) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        batchPages.forEach((dataUrl, i) => {
            if (i > 0) doc.addPage();
            doc.addImage(dataUrl, 'JPEG', 0, 0, 210, 297);
        });

        const pdfFilename = `scanned_document_${Date.now()}.pdf`;
        doc.save(pdfFilename);

        const pdfDataUri = doc.output('datauristring');
        saveFileToCloud(pdfFilename, pdfDataUri, 'application/pdf');
    });


    // ==========================================
    // 2. DOCUMENT CLEANER CONTROLLER
    // ==========================================
    const cleanerFileInput = document.getElementById('cleanerFileInput');
    const cleanerWorkspace = document.getElementById('cleanerWorkspace');
    const cleanerEmptyState = document.getElementById('cleanerEmptyState');
    const cleanerCanvas = document.getElementById('cleanerCanvas');
    const cleanerThreshold = document.getElementById('cleanerThreshold');
    const cleanerShadow = document.getElementById('cleanerShadow');
    let activeCleanerMode = 'whiteboard';

    cleanerFileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            loadCleanerFile(e.target.files[0]);
        }
    });

    async function loadCleanerFile(file) {
        cleanerImageObj = await OmniTools.loadImageFromFile(file);
        cleanerEmptyState.classList.add('hidden');
        cleanerWorkspace.classList.remove('hidden');
        renderCleaner();
    }

    window.applyCleanerMode = function(mode) {
        activeCleanerMode = mode;
        renderCleaner();
    };

    cleanerThreshold?.addEventListener('input', (e) => {
        document.getElementById('cleanerThresholdVal').textContent = e.target.value;
        renderCleaner();
    });

    cleanerShadow?.addEventListener('input', (e) => {
        document.getElementById('cleanerShadowVal').textContent = `${e.target.value}%`;
        renderCleaner();
    });

    function renderCleaner() {
        if (!cleanerImageObj) return;
        cleanerCanvas.width = cleanerImageObj.naturalWidth || cleanerImageObj.width;
        cleanerCanvas.height = cleanerImageObj.naturalHeight || cleanerImageObj.height;
        const ctx = cleanerCanvas.getContext('2d');
        ctx.drawImage(cleanerImageObj, 0, 0);

        OmniTools.cleanDocument(
            cleanerCanvas,
            activeCleanerMode,
            parseInt(cleanerThreshold.value),
            parseInt(cleanerShadow.value)
        );
    }

    document.getElementById('downloadCleanedDocBtn')?.addEventListener('click', () => {
        if (!cleanerCanvas) return;
        const link = document.createElement('a');
        link.download = `cleaned_doc_${Date.now()}.png`;
        link.href = cleanerCanvas.toDataURL('image/png');
        link.click();
        saveFileToCloud(link.download, link.href, 'image/png');
    });


    // ==========================================
    // 3. PHOTO RESIZER CONTROLLER
    // ==========================================
    const resizerFileInput = document.getElementById('resizerFileInput');
    const resizerWorkspace = document.getElementById('resizerWorkspace');
    const resizerEmptyState = document.getElementById('resizerEmptyState');
    const resizerCanvas = document.getElementById('resizerCanvas');
    const resizerWidth = document.getElementById('resizerWidth');
    const resizerHeight = document.getElementById('resizerHeight');
    const resizerLockAspect = document.getElementById('resizerLockAspect');

    resizerFileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            loadResizerFile(e.target.files[0]);
        }
    });

    async function loadResizerFile(file) {
        resizerImageObj = await OmniTools.loadImageFromFile(file);
        const origW = resizerImageObj.naturalWidth || resizerImageObj.width;
        const origH = resizerImageObj.naturalHeight || resizerImageObj.height;

        resizerWidth.value = origW;
        resizerHeight.value = origH;
        document.getElementById('origDimText').textContent = `${origW} x ${origH} px`;
        
        resizerEmptyState.classList.add('hidden');
        resizerWorkspace.classList.remove('hidden');
        renderResizer();
    }

    resizerWidth?.addEventListener('input', () => {
        if (resizerLockAspect.checked && resizerImageObj) {
            const ratio = resizerImageObj.naturalHeight / resizerImageObj.naturalWidth;
            resizerHeight.value = Math.round(resizerWidth.value * ratio);
        }
        renderResizer();
    });

    resizerHeight?.addEventListener('input', () => {
        if (resizerLockAspect.checked && resizerImageObj) {
            const ratio = resizerImageObj.naturalWidth / resizerImageObj.naturalHeight;
            resizerWidth.value = Math.round(resizerHeight.value * ratio);
        }
        renderResizer();
    });

    window.applyResizePreset = function(w, h) {
        resizerWidth.value = w;
        resizerHeight.value = h;
        renderResizer();
    };

    function renderResizer() {
        if (!resizerImageObj) return;
        const targetW = parseInt(resizerWidth.value) || 100;
        const targetH = parseInt(resizerHeight.value) || 100;

        resizerCanvas.width = targetW;
        resizerCanvas.height = targetH;
        const ctx = resizerCanvas.getContext('2d');
        ctx.drawImage(resizerImageObj, 0, 0, targetW, targetH);

        document.getElementById('newDimText').textContent = `${targetW} x ${targetH} px`;
    }

    document.getElementById('downloadResizedBtn')?.addEventListener('click', () => {
        if (!resizerCanvas) return;
        const link = document.createElement('a');
        link.download = `resized_${resizerCanvas.width}x${resizerCanvas.height}.jpg`;
        link.href = resizerCanvas.toDataURL('image/jpeg', 0.92);
        link.click();
        saveFileToCloud(link.download, link.href, 'image/jpeg');
    });


    // ==========================================
    // 4. ENHANCER & SPOT REMOVER CONTROLLER
    // ==========================================
    const enhancerFileInput = document.getElementById('enhancerFileInput');
    const enhancerWorkspace = document.getElementById('enhancerWorkspace');
    const enhancerEmptyState = document.getElementById('enhancerEmptyState');
    const enhancerCanvas = document.getElementById('enhancerCanvas');

    const enhSliderBrightness = document.getElementById('enhSliderBrightness');
    const enhSliderContrast = document.getElementById('enhSliderContrast');
    const enhSliderSaturation = document.getElementById('enhSliderSaturation');
    const enhSliderSharpness = document.getElementById('enhSliderSharpness');
    const eraserSizeSlider = document.getElementById('eraserSizeSlider');

    enhancerFileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            loadEnhancerFile(e.target.files[0]);
        }
    });

    async function loadEnhancerFile(file) {
        enhancerImageObj = await OmniTools.loadImageFromFile(file);
        enhancerEmptyState.classList.add('hidden');
        enhancerWorkspace.classList.remove('hidden');
        renderEnhancer();
    }

    window.switchEnhancerMode = function(mode) {
        enhancerMode = mode;
        const adjustBtn = document.getElementById('enhancerSubTabAdjust');
        const eraserBtn = document.getElementById('enhancerSubTabEraser');
        const slidersPanel = document.getElementById('enhancerSlidersPanel');
        const eraserPanel = document.getElementById('enhancerEraserPanel');
        const spotBrushTip = document.getElementById('spotBrushTip');

        if (mode === 'adjust') {
            adjustBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white transition';
            eraserBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition';
            slidersPanel.classList.remove('hidden');
            eraserPanel.classList.add('hidden');
            spotBrushTip.classList.add('hidden');
        } else {
            eraserBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white transition';
            adjustBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition';
            eraserPanel.classList.remove('hidden');
            slidersPanel.classList.add('hidden');
            spotBrushTip.classList.remove('hidden');
        }
    };

    [enhSliderBrightness, enhSliderContrast, enhSliderSaturation, enhSliderSharpness].forEach(slider => {
        slider?.addEventListener('input', () => {
            document.getElementById(`enhVal${slider.id.replace('enhSlider', '')}`).textContent = slider.value;
            renderEnhancer();
        });
    });

    eraserSizeSlider?.addEventListener('input', (e) => {
        document.getElementById('eraserSizeVal').textContent = `${e.target.value}px`;
    });

    window.autoEnhancePhoto = function() {
        enhSliderBrightness.value = 10;
        enhSliderContrast.value = 20;
        enhSliderSaturation.value = 15;
        enhSliderSharpness.value = 30;
        renderEnhancer();
    };

    function renderEnhancer() {
        if (!enhancerImageObj) return;
        OmniTools.enhancePhoto(enhancerImageObj, enhancerCanvas, {
            brightness: enhSliderBrightness.value,
            contrast: enhSliderContrast.value,
            saturation: enhSliderSaturation.value,
            sharpness: enhSliderSharpness.value
        });
    }

    // Spot Eraser Interactive Painting
    enhancerCanvas?.addEventListener('mousedown', (e) => {
        if (enhancerMode !== 'eraser') return;
        isDrawingSpot = true;
        handleEraserBrush(e);
    });

    enhancerCanvas?.addEventListener('mousemove', (e) => {
        if (isDrawingSpot && enhancerMode === 'eraser') {
            handleEraserBrush(e);
        }
    });

    window.addEventListener('mouseup', () => { isDrawingSpot = false; });

    function handleEraserBrush(e) {
        const rect = enhancerCanvas.getBoundingClientRect();
        const scaleX = enhancerCanvas.width / rect.width;
        const scaleY = enhancerCanvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        OmniTools.eraseSpot(enhancerCanvas, x, y, parseInt(eraserSizeSlider.value));
    }

    document.getElementById('downloadEnhancedBtn')?.addEventListener('click', () => {
        if (!enhancerCanvas) return;
        const link = document.createElement('a');
        link.download = `enhanced_photo_${Date.now()}.png`;
        link.href = enhancerCanvas.toDataURL('image/png');
        link.click();
        saveFileToCloud(link.download, link.href, 'image/png');
    });


    // ==========================================
    // 5. BACKGROUND REMOVER CONTROLLER
    // ==========================================
    const bgFileInput = document.getElementById('bgFileInput');
    const bgWorkspace = document.getElementById('bgWorkspace');
    const bgEmptyState = document.getElementById('bgEmptyState');
    const bgCanvas = document.getElementById('bgCanvas');
    const bgToleranceSlider = document.getElementById('bgToleranceSlider');
    let activeBgFill = 'transparent';

    bgFileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            loadBgFile(e.target.files[0]);
        }
    });

    async function loadBgFile(file) {
        bgImageObj = await OmniTools.loadImageFromFile(file);
        bgEmptyState.classList.add('hidden');
        bgWorkspace.classList.remove('hidden');
        renderBgRemover();
    }

    bgToleranceSlider?.addEventListener('input', (e) => {
        document.getElementById('bgToleranceVal').textContent = `${e.target.value}%`;
        renderBgRemover();
    });

    window.setBgReplacement = function(color) {
        activeBgFill = color;
        renderBgRemover();
    };

    window.autoRemoveBackground = function() {
        renderBgRemover();
    };

    function renderBgRemover() {
        if (!bgImageObj) return;
        bgCanvas.width = bgImageObj.naturalWidth || bgImageObj.width;
        bgCanvas.height = bgImageObj.naturalHeight || bgImageObj.height;
        const ctx = bgCanvas.getContext('2d');
        ctx.drawImage(bgImageObj, 0, 0);

        OmniTools.removeBackground(bgCanvas, parseInt(bgToleranceSlider.value), activeBgFill);
    }

    document.getElementById('downloadBgRemovedBtn')?.addEventListener('click', () => {
        if (!bgCanvas) return;
        const link = document.createElement('a');
        const format = activeBgFill === 'transparent' ? 'image/png' : 'image/jpeg';
        const ext = activeBgFill === 'transparent' ? 'png' : 'jpg';

        link.download = `bg_cutout_${Date.now()}.${ext}`;
        link.href = bgCanvas.toDataURL(format, 0.95);
        link.click();
        saveFileToCloud(link.download, link.href, format);
    });


    // ==========================================
    // 6. FORMAT CONVERTER CONTROLLER
    // ==========================================
    const converterInputFile = document.getElementById('converterInputFile');
    const converterTargetFormat = document.getElementById('converterTargetFormat');
    const processConvertBtn = document.getElementById('processConvertBtn');

    converterInputFile?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            updateConverterFileName(e.target.files[0]);
        }
    });

    function updateConverterFileName(file) {
        document.getElementById('converterFileName').textContent = `Selected: ${file.name} (${OmniTools.formatBytes(file.size)})`;
        processConvertBtn.disabled = false;
    }

    window.quickConvertTrigger = function(targetFormat) {
        switchTab('converter');
        converterTargetFormat.value = targetFormat;
    };

    processConvertBtn?.addEventListener('click', async () => {
        if (!converterInputFile.files || converterInputFile.files.length === 0) return;
        const file = converterInputFile.files[0];
        const targetFmt = converterTargetFormat.value;

        const imgObj = await OmniTools.loadImageFromFile(file);
        const canvas = document.createElement('canvas');
        canvas.width = imgObj.naturalWidth || imgObj.width;
        canvas.height = imgObj.naturalHeight || imgObj.height;
        const ctx = canvas.getContext('2d');

        if (targetFmt === 'pdf') {
            ctx.drawImage(imgObj, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            doc.addImage(dataUrl, 'JPEG', 0, 0, 210, 297);
            const pdfName = file.name.replace(/\.[^/.]+$/, "") + '.pdf';
            doc.save(pdfName);
            saveFileToCloud(pdfName, doc.output('datauristring'), 'application/pdf');
            return;
        }

        if (targetFmt === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(imgObj, 0, 0);

        const mimeMap = {
            png: 'image/png',
            jpeg: 'image/jpeg',
            webp: 'image/webp'
        };

        const convertedDataUrl = canvas.toDataURL(mimeMap[targetFmt], 0.92);
        const outName = file.name.replace(/\.[^/.]+$/, "") + `.${targetFmt === 'jpeg' ? 'jpg' : targetFmt}`;

        const link = document.createElement('a');
        link.download = outName;
        link.href = convertedDataUrl;
        link.click();

        saveFileToCloud(outName, convertedDataUrl, mimeMap[targetFmt]);
    });


    // ==========================================
    // 7. FILE SIZE REDUCER & COMPRESSOR CONTROLLER
    // ==========================================
    const compressorFileInput = document.getElementById('compressorFileInput');
    const compressorWorkspace = document.getElementById('compressorWorkspace');
    const compressorEmptyState = document.getElementById('compressorEmptyState');
    const compressorPreviewImg = document.getElementById('compressorPreviewImg');
    const compQualitySlider = document.getElementById('compQualitySlider');

    let currentCompressedResult = null;

    compressorFileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            loadCompressorFile(e.target.files[0]);
        }
    });

    async function loadCompressorFile(file) {
        compressorImageObj = await OmniTools.loadImageFromFile(file);
        document.getElementById('compOrigSizeText').textContent = OmniTools.formatBytes(file.size);
        
        compressorEmptyState.classList.add('hidden');
        compressorWorkspace.classList.remove('hidden');
        renderCompressor();
    }

    compQualitySlider?.addEventListener('input', (e) => {
        document.getElementById('compQualityVal').textContent = `${e.target.value}%`;
        renderCompressor();
    });

    window.applyTargetSizePreset = async function(targetKB) {
        if (!compressorImageObj) return;
        const res = await OmniTools.compressImageToTargetKB(compressorImageObj, targetKB);
        updateCompressorUI(res);
    };

    async function renderCompressor() {
        if (!compressorImageObj) return;
        const quality = parseInt(compQualitySlider.value) / 100;

        const canvas = document.createElement('canvas');
        canvas.width = compressorImageObj.naturalWidth || compressorImageObj.width;
        canvas.height = compressorImageObj.naturalHeight || compressorImageObj.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(compressorImageObj, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const blob = OmniTools.dataURLtoBlob(dataUrl);

        updateCompressorUI({
            dataUrl: dataUrl,
            blob: blob,
            size: blob.size
        });
    }

    function updateCompressorUI(result) {
        currentCompressedResult = result;
        compressorPreviewImg.src = result.dataUrl;

        const origSizeStr = document.getElementById('compOrigSizeText').textContent;
        document.getElementById('compNewSizeText').textContent = OmniTools.formatBytes(result.size);
    }

    document.getElementById('downloadCompressedBtn')?.addEventListener('click', () => {
        if (!currentCompressedResult) return;
        const link = document.createElement('a');
        link.download = `compressed_${Date.now()}.jpg`;
        link.href = currentCompressedResult.dataUrl;
        link.click();
        saveFileToCloud(link.download, link.href, 'image/jpeg');
    });


    // ==========================================
    // 8. STUDENT PRESETS WORKFLOW
    // ==========================================
    window.launchPresetWorkflow = function(type) {
        if (type === 'passport') {
            switchTab('resizer');
            applyResizePreset(350, 450);
            alert('Upload your photo in Resizer tab. It will be pre-configured for 35x45mm Passport size.');
        } else if (type === 'signature') {
            switchTab('cleaner');
            alert('Upload your signature photo in Document Cleaner to darken ink and whiten background.');
        }
    };


    // ==========================================
    // 9. OMNICLOUD STORAGE CONTROLLER
    // ==========================================
    function getCloudFiles() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveFileToCloud(filename, dataUrl, mimeType) {
        const files = getCloudFiles();
        files.unshift({
            id: Date.now(),
            filename: filename,
            dataUrl: dataUrl,
            mimeType: mimeType,
            size: Math.round(dataUrl.length * 0.75),
            date: new Date().toLocaleDateString()
        });

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
        } catch (err) {
            // If storage quota exceeded, prune oldest
            if (files.length > 1) {
                files.pop();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
            }
        }
        renderCloudStorage();
    }

    function renderCloudStorage() {
        const files = getCloudFiles();
        const cloudGrid = document.getElementById('cloudGrid');
        const cloudEmptyState = document.getElementById('cloudEmptyState');
        const cloudHeaderCount = document.getElementById('cloudHeaderCount');

        cloudHeaderCount.textContent = `Cloud Drive (${files.length})`;

        if (files.length === 0) {
            cloudGrid.innerHTML = '';
            cloudEmptyState?.classList.remove('hidden');
            updateStorageUsageBar(0);
            return;
        }

        cloudEmptyState?.classList.add('hidden');
        cloudGrid.innerHTML = '';

        let totalBytes = 0;

        files.forEach(file => {
            totalBytes += file.size;
            const isPdf = file.mimeType === 'application/pdf';

            const card = document.createElement('div');
            card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2 group hover:border-sky-500/50 transition';
            card.innerHTML = `
                <div class="aspect-square bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center relative">
                    ${isPdf ? `
                        <div class="text-rose-400 flex flex-col items-center">
                            <i data-lucide="file-text" class="w-10 h-10 mb-1"></i>
                            <span class="text-[10px] font-bold">PDF</span>
                        </div>
                    ` : `
                        <img src="${file.dataUrl}" class="w-full h-full object-cover">
                    `}
                </div>
                <div>
                    <div class="text-xs font-semibold text-slate-200 truncate" title="${file.filename}">${file.filename}</div>
                    <div class="text-[11px] text-slate-400 flex justify-between mt-0.5">
                        <span>${OmniTools.formatBytes(file.size)}</span>
                        <span>${file.date}</span>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                    <a href="${file.dataUrl}" download="${file.filename}" class="flex-1 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 text-center rounded text-[11px] font-semibold transition">
                        Download
                    </a>
                    <button onclick="deleteCloudFile(${file.id})" class="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            `;
            cloudGrid.appendChild(card);
        });

        updateStorageUsageBar(totalBytes);
        if (window.lucide) window.lucide.createIcons();
    }

    function updateStorageUsageBar(usedBytes) {
        const maxBytes = 50 * 1024 * 1024; // 50MB
        const pct = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

        document.getElementById('storageUsagePct').textContent = `${pct}%`;
        document.getElementById('storageBar').style.width = `${pct}%`;
        document.getElementById('storageUsedText').textContent = `${OmniTools.formatBytes(usedBytes)} used`;
    }

    window.deleteCloudFile = function(id) {
        const files = getCloudFiles().filter(f => f.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
        renderCloudStorage();
    };

    document.getElementById('clearCloudDriveBtn')?.addEventListener('click', () => {
        if (confirm('Clear all saved files from Cloud Storage?')) {
            localStorage.removeItem(STORAGE_KEY);
            renderCloudStorage();
        }
    });

    document.getElementById('downloadAllCloudZipBtn')?.addEventListener('click', async () => {
        const files = getCloudFiles();
        if (files.length === 0) return;

        const zip = new JSZip();
        files.forEach(f => {
            const base64Data = f.dataUrl.split(',')[1];
            zip.file(f.filename, base64Data, { base64: true });
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.download = `OmniCloud_Export_${Date.now()}.zip`;
        link.href = URL.createObjectURL(zipBlob);
        link.click();
    });

    // Initial Load
    renderCloudStorage();
});
