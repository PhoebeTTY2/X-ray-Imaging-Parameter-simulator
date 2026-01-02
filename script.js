// script.js (Full Replacement - Working Sample & Upload)
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const kvSlider = document.getElementById('kv');
    const maSlider = document.getElementById('ma');
    const timeSlider = document.getElementById('time');
    const filterSlider = document.getElementById('filter');
    
    const kvValue = document.getElementById('kv-value');
    const maValue = document.getElementById('ma-value');
    const timeValue = document.getElementById('time-value');
    const filterValue = document.getElementById('filter-value');
    
    const brightnessValue = document.getElementById('brightness-value');
    const contrastValue = document.getElementById('contrast-value');
    const noiseValue = document.getElementById('noise-value');
    const doseValue = document.getElementById('dose-value');
    const currentSettings = document.getElementById('current-settings');
    const imageStatus = document.getElementById('image-status');
    
    const canvas = document.getElementById('xray-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    const uploadInput = document.getElementById('image-upload');
    const uploadArea = document.getElementById('upload-area');
    const resetButton = document.getElementById('reset-btn');
    const exportButton = document.getElementById('export-btn');
    const sampleButton = document.getElementById('sample-btn');
    
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetViewBtn = document.getElementById('reset-view');
    
    // State variables
    let uploadedImage = null;
    let zoomLevel = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    const defaults = { kv: 70, ma: 200, time: 0.10, filter: 2.5 };

    function initialize() {
        resizeCanvas();
        resetToDefaults();
        
        // Listeners
        [kvSlider, maSlider, timeSlider, filterSlider].forEach(el => {
            el.addEventListener('input', handleParameterChange);
        });
        
        uploadInput.addEventListener('change', handleImageUpload);
        sampleButton.addEventListener('click', loadSampleImage);
        resetButton.addEventListener('click', resetToDefaults);
        exportButton.addEventListener('click', exportImage);
        
        // Controls
        zoomInBtn.onclick = () => { zoomLevel *= 1.1; render(); };
        zoomOutBtn.onclick = () => { zoomLevel /= 1.1; render(); };
        resetViewBtn.onclick = () => { zoomLevel = 1; offsetX = 0; offsetY = 0; render(); };

        // Mouse Panning
        canvas.onmousedown = (e) => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; };
        window.onmousemove = (e) => {
            if (isDragging) {
                offsetX += e.clientX - lastMouseX;
                offsetY += e.clientY - lastMouseY;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                render();
            }
        };
        window.onmouseup = () => isDragging = false;

        window.addEventListener('resize', resizeCanvas);
        createDefaultImage();
    }

    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        render();
    }

    function handleParameterChange() {
        updateValueDisplays();
        updateMetrics();
        render();
    }

    function updateValueDisplays() {
        kvValue.textContent = kvSlider.value;
        maValue.textContent = maSlider.value;
        timeValue.textContent = parseFloat(timeSlider.value).toFixed(2);
        filterValue.textContent = parseFloat(filterSlider.value).toFixed(1);
        currentSettings.textContent = `kV: ${kvSlider.value}, mA: ${maSlider.value}, Time: ${timeSlider.value}s, Filter: ${filterSlider.value}mm`;
    }

    function updateMetrics() {
        let mAs = maSlider.value * timeSlider.value;
        let dose = (mAs * Math.pow(kvSlider.value / 70, 2) / (parseFloat(filterSlider.value) + 1)).toFixed(2);
        doseValue.textContent = dose + " mGy";
        
        // Update simple status labels
        brightnessValue.textContent = kvSlider.value > 90 ? "High" : "Medium";
        contrastValue.textContent = kvSlider.value < 60 ? "High" : "Normal";
        noiseValue.textContent = maSlider.value < 100 ? "High" : "Low";
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                uploadedImage = img;
                imageStatus.textContent = "Custom Image Loaded";
                render();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function loadSampleImage() {
        const img = new Image();
        img.crossOrigin = "anonymous";
        // Reliable public domain X-ray image
        img.src = "https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/000001-1.jpg";
        imageStatus.textContent = "Loading sample...";
        img.onload = () => {
            uploadedImage = img;
            imageStatus.textContent = "Sample Loaded Successfully";
            render();
        };
        img.onerror = () => {
            alert("Sample image failed to load. Please upload a local file.");
            imageStatus.textContent = "Error loading sample.";
        };
    }

    function render() {
        if (!uploadedImage) {
            createDefaultImage();
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const ratio = Math.min(canvas.width / uploadedImage.width, canvas.height / uploadedImage.height);
        const w = uploadedImage.width * ratio * zoomLevel;
        const h = uploadedImage.height * ratio * zoomLevel;

        ctx.save();
        ctx.translate(canvas.width/2 + offsetX, canvas.height/2 + offsetY);
        ctx.drawImage(uploadedImage, -w/2, -h/2, w, h);
        ctx.restore();

        applyXrayEffects();
    }

    function applyXrayEffects() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const kv = parseFloat(kvSlider.value);
        const ma = parseFloat(maSlider.value);
        const time = parseFloat(timeSlider.value);
        const filter = parseFloat(filterSlider.value);

        // Physics Logic
        const exposure = (ma * time * Math.pow(kv, 2)) / 60000;
        const contrast = 2.2 - (kv / 55);
        // mmAl Filter hardening effect (dimming and quality change)
        const filterEffect = 1.0 - (filter * 0.08);

        for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < 3; j++) {
                let pixel = data[i + j];
                pixel = pixel * exposure * filterEffect;
                pixel = ((pixel - 128) * contrast) + 128;
                data[i + j] = Math.max(0, Math.min(255, pixel));
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    function createDefaultImage() {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Upload an image or load sample to start", canvas.width/2, canvas.height/2);
    }

    function resetToDefaults() {
        kvSlider.value = defaults.kv;
        maSlider.value = defaults.ma;
        timeSlider.value = defaults.time;
        filterSlider.value = defaults.filter;
        zoomLevel = 1; offsetX = 0; offsetY = 0;
        updateValueDisplays();
        updateMetrics();
        render();
    }

    function exportImage() {
        const link = document.createElement('a');
        link.download = 'xray-simulator-output.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    initialize();
});