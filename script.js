const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const currentSizeDisplay = document.getElementById('currentSizeDisplay');
const expectedSizeDisplay = document.getElementById('expectedSizeDisplay');
const qualityInput = document.getElementById('quality');
const qualityVal = document.getElementById('qualityVal');
const compressBtn = document.getElementById('compressBtn');
const status = document.getElementById('status');

// Helper to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update Expected Size Logic
function updateExpectedSize() {
    const file = fileInput.files[0];
    if (!file) return;

    const quality = parseFloat(qualityInput.value);
    let ratio;

    if (file.type.startsWith('image/')) {
        // Estimate: Higher quality setting = closer to original size
        ratio = 0.1 + (quality * 0.8); 
    } else {
        // PDFs don't shrink as linearly as images browser-side
        ratio = 0.85 + (quality * 0.1); 
    }

    expectedSizeDisplay.innerText = formatBytes(file.size * ratio);
}

// Event Listeners
dropZone.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.innerText = file.name;
        document.getElementById('dropText').style.display = 'none';
        currentSizeDisplay.innerText = formatBytes(file.size);
        updateExpectedSize();
    }
};

qualityInput.oninput = () => {
    qualityVal.innerText = Math.round(qualityInput.value * 100) + '%';
    updateExpectedSize();
};

compressBtn.onclick = async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Please select a file!");

    status.innerText = "Processing... please wait.";
    const quality = parseFloat(qualityInput.value);

    if (file.type.startsWith('image/')) {
        compressImage(file, quality);
    } else if (file.type === 'application/pdf') {
        compressPDF(file);
    }
};

function compressImage(file, quality) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
                download(blob, `compressed_${file.name}`);
            }, 'image/jpeg', quality);
        };
    };
}

async function compressPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Browser-side PDF compression is primarily metadata stripping and 
        // structure optimization using PDF-Lib's 'save' settings.
        const pdfBytes = await pdfDoc.save({ 
            useObjectStreams: true,
            addDefaultPage: false
        });
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        download(blob, `optimized_${file.name}`);
    } catch (e) {
        status.innerText = "Error optimizing PDF.";
    }
}

function download(blob, name) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    status.innerText = "Successfully compressed!";
}
