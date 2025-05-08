/* Global variables */
let editor = null;
let originalFileBytes = null;
let originalFileName = 'modified_file.json'; // Default download name for JSON
let encryptedModifiedBytes = null;

const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const decryptButton = document.getElementById('decryptButton');
const encryptButton = document.getElementById('encryptButton');
const downloadButton = document.getElementById('downloadButton');
const statusMessages = document.getElementById('statusMessages');
const editorContainer = document.getElementById('editorContainer');

/* XOR encryption/decryption key from HCR2.Files.Editor.py */
const key = [
    0x5B, 0x42, 0x9D, 0xB1, 0xB4, 0x40, 0xDB, 0x83, 0x85, 0x35, 0x79, 0x37, 0xF6, 0xB3, 0xF8, 0x9C,
    0x47, 0xB5, 0xE1, 0x96, 0x74, 0x55, 0x92, 0x43, 0xAD, 0x49, 0x90, 0xBB, 0x7C, 0x7A, 0xC7, 0xD1,
    0x22, 0x38, 0xED, 0xB4, 0xAF, 0x12, 0xA8, 0x31, 0xE0, 0x25, 0x78, 0xD9, 0xF9, 0x1E, 0xF2, 0x9D,
    0x08, 0xB4, 0xF0, 0x58, 0x42, 0x8A, 0xFA, 0x02, 0xE1, 0x80, 0xA1, 0x0C, 0x12, 0x69, 0xDD, 0x91,
    0x19, 0xD0, 0x1F, 0x18, 0x1F, 0x93, 0x6E, 0x24, 0xA0, 0x76, 0x07, 0x30, 0xB5, 0xD3, 0xEF, 0xC9,
    0xA6, 0x0D, 0xD9, 0xEB, 0x58, 0xFC, 0x39, 0x73, 0x80, 0x24, 0x36, 0xD4, 0xCC, 0xC3, 0x6C, 0x32,
    0x66, 0x6E, 0x2E, 0xAB, 0xE0, 0x72, 0xF6, 0x12, 0x98, 0x97, 0x78, 0x66, 0x6A, 0x49, 0xB5, 0x05,
    0xF5, 0x01, 0xB3, 0xF8, 0AC, 0xA7, 0x03, 0x3C, 0x40, 0xA5, 0xEF, 0x97, 0x8E, 0x30, 0x56, 0x42,
    0x41, 0x7D, 0x37, 0x1E, 0x2C, 0x35, 0xD4, 0xB6, 0xD1, 0x0A, 0x45, 0x92, 0x5E, 0xE3, 0x70, 0xD9,
    0x98, 0xB1, 0xAE, 0x80, 0xD1, 0x07, 0x5A, 0x84, 0x85, 0x19, 0xDE, 0x75, 0xA8, 0xCE, 0xCE, 0x14,
    0x5E, 0xA6, 0x7E, 0x6A, 0x15, 0xC9, 0x03, 0x1A, 0x0C, 0x0E, 0x9D, 0x92, 0xFA, 0x89, 0x64, 0x55,
    0xF2, 0x5C, 0xBB, 0x0A, 0x44, 0x2A, 0x78, 0x82, 0xB1, 0xFF, 0xDA, 0x1B, 0x6A, 0x1E, 0x16, 0x5A,
    0x74, 0x77, 0AC, 0x6B, 0xFA, 0x04, 0x38, 0xD9, 0xF7, 0x04, 0x94, 0x2D, 0xB4, 0x0E, 0x2F, 0x83,
    0xAF, 0xFB, 0xA9, 0xE7, 0x6F, 0x3B, 0x48, 0xEC, 0xB0, 0x71, 0x4C, 0x85, 0x06, 0xA5, 0xF2, 0xF2,
    0xBB, 0x5F, 0x56, 0x98, 0x8F, 0xFC, 0x54, 0x4F, 0xBD, 0xA4, 0x0A, 0x71, 0xAF, 0xE2, 0x8D, 0xBF,
    0x28, 0xC5, 0x99, 0xE2, 0x7E, 0xA8, 0x4F, 0x5D, 0x80, 0x12, 0x12, 0x9B, 0x62, 0xE3, 0x1B, 0x1D,
    0x8F, 0xA3, 0xE9, 0xE9, 0xC4, 0xF4, 0x32
];

/* XOR operation function (modified to handle header size) */
function xorCrypt(dataBytes, headerSize) {
    const dataLength = dataBytes.length;
    const keyLength = key.length;
    const outputBytes = new Uint8Array(dataLength);

    for (let i = 0; i < dataLength; i++) {
        const keyIndex = (i + headerSize) % keyLength;
        outputBytes[i] = dataBytes[i] ^ key[keyIndex];
    }
    return outputBytes;
}

/* Function to concatenate two Uint8Arrays */
function concatUint8Arrays(arr1, arr2) {
    const result = new Uint8Array(arr1.length + arr2.length);
    result.set(arr1, 0);
    result.set(arr2, arr1.length);
    return result;
}

/* Setup CodeMirror editor instance */
function setupEditor() {
    console.log("Attempting to set up CodeMirror editor...");
    if (window.CodeMirror) {
        if (editor) {
            console.log("Destroying existing CodeMirror instance.");
            editor.toTextArea();
        }
        editorContainer.innerHTML = '';
        try {
            editor = CodeMirror(editorContainer, {
                mode: { name: "javascript", json: true },
                theme: "material-darker",
                lineNumbers: true,
                lineWrapping: true,
                readOnly: true, // Initially read-only
                gutters: ["CodeMirror-lint-markers"],
                lint: true
            });
            editor.setSize("100%", "100%");
            console.log("CodeMirror editor setup complete. Editor instance:", editor);
             // Check initial readOnly state after setup
            console.log("Editor initially readOnly:", editor.getOption("readOnly"));
            return true; // Indicate success
        } catch (e) {
            console.error("Error initializing CodeMirror:", e);
            editorContainer.innerHTML = '<div class="alert alert-danger" role="alert"><i class="bi bi-x-octagon-fill me-2"></i>Error: Code editor initialization failed. Linting addons might be missing or failing. Check console.</div>';
            editor = null; // Ensure editor is null on failure
            return false; // Indicate failure
        }
    } else {
        console.error("CodeMirror library is not loaded. Cannot setup editor.");
        editorContainer.innerHTML = '<div class="alert alert-danger" role="alert"><i class="bi bi-x-octagon-fill me-2"></i>Error: The code editor could not be loaded. Please check your internet connection or script inclusions.</div>';
        editor = null; // Ensure editor is null if CodeMirror itself is not available
        return false; // Indicate failure
    }
}

/* Determine header size based on file bytes (only checks for FNX) */
function determineHeaderSize(fileBytes) {
    if (!fileBytes || fileBytes.length < 4) {
        return 0;
    }
    if (fileBytes[0] === 0x46 && fileBytes[1] === 0x4E && fileBytes[2] === 0x58) { // "FNX"
        console.log("Detected FNX header.");
        return 4;
    } else {
         console.log("No FNX header detected. Assuming no header.");
        return 0;
    }
}

/* Simple function to display status messages */
function showStatus(message, type = 'info') {
    const alertClass = {
        'info': 'alert-info', 'success': 'alert-success',
        'warning': 'alert-warning', 'danger': 'alert-danger'
    }[type];
    const iconClass = {
        'info': 'bi-info-circle-fill', 'success': 'bi-check-circle-fill',
        'warning': 'bi-exclamation-triangle-fill', 'danger': 'bi-x-octagon-fill'
    }[type];

    const messageDiv = document.createElement('div');
    messageDiv.className = `alert ${alertClass} alert-dismissible fade show d-flex align-items-center`;
    messageDiv.role = 'alert';
    messageDiv.innerHTML = `
        <i class="bi ${iconClass} me-3 fs-5"></i>
        <div>${message}</div>
        <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    statusMessages.innerHTML = '';
    statusMessages.appendChild(messageDiv);
    console.log(`Status [${type.toUpperCase()}]: ${message}`);
}

/* Handle file input change */
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    statusMessages.innerHTML = '';
    if (file) {
        try {
            originalFileName = file.name;
            fileNameDisplay.textContent = `Selected file: ${originalFileName}`;

            if (window.CodeMirror) {
                // Re-setup editor on new file selection
                if (setupEditor()) { // setupEditor now returns true on success, false on failure
                    decryptButton.disabled = false;
                    if (editor) { // Check if editor was successfully created
                        editor.setValue(''); // Clear any previous content
                         editor.setOption("readOnly", true); // Ensure it's read-only until decrypted
                    }
                } else {
                    // Error message handled within setupEditor or by a general message
                    showStatus("Error: Code editor could not be initialized. Please check console.", 'danger');
                    decryptButton.disabled = true;
                }
            } else {
                showStatus("Error: The code editor library is not available. Cannot process file.", 'danger');
                decryptButton.disabled = true;
            }

            encryptButton.disabled = true;
            downloadButton.disabled = true;
            originalFileBytes = null;
            encryptedModifiedBytes = null;
            console.log(`File selected: ${originalFileName}`);
        } catch (error) {
            console.error("Error during file selection processing:", error);
            showStatus(`An error occurred while processing the file selection: ${error.message}`, 'danger');
            fileNameDisplay.textContent = 'No file selected.';
            decryptButton.disabled = true;
            encryptButton.disabled = true;
            downloadButton.disabled = true;
            if (editor) {
                editor.setValue('');
                editor.setOption("readOnly", true);
            }
            originalFileBytes = null;
            encryptedModifiedBytes = null;
        }
    } else {
        originalFileName = '';
        fileNameDisplay.textContent = 'No file selected.';
        decryptButton.disabled = true;
        if (editor) {
            editor.setValue('');
            editor.setOption("readOnly", true);
        }
        encryptButton.disabled = true;
        downloadButton.disabled = true;
        originalFileBytes = null;
        encryptedModifiedBytes = null;
        showStatus('No file selected.', 'info');
    }
});

/* Handle Decrypt button click */
decryptButton.addEventListener('click', () => {
    if (!fileInput.files[0]) {
        showStatus('Please select a file first.', 'warning');
        return;
    }
    if (!editor || !window.CodeMirror) { // Also check if editor instance exists
        showStatus('Editor is not ready. Please ensure CodeMirror is loaded and initialized.', 'warning');
        return;
    }
    if (!originalFileBytes) {
        // Read the file again if not already in originalFileBytes (should happen on file select, but safety check)
         const reader = new FileReader();
         reader.onload = (e) => {
             originalFileBytes = new Uint8Array(e.target.result);
             processDecryption(); // Call a function to continue after file read
         };
         reader.onerror = (e) => {
             console.error("Error reading file for decryption:", e);
             showStatus(`Error reading file for decryption: ${e.message}`, 'danger');
         }
         reader.readAsArrayBuffer(fileInput.files[0]);
    } else {
        // File bytes are already available, proceed with decryption
        processDecryption();
    }
});

function processDecryption() {
     try {
        const headerSize = determineHeaderSize(originalFileBytes);

        if (headerSize === 0) {
            showStatus('Error: Only FNX JSON files are supported by this editor.', 'danger');
            originalFileBytes = null;
            if (editor) { editor.setValue(''); editor.setOption("readOnly", true); }
            encryptButton.disabled = true; downloadButton.disabled = true;
            return;
        }
        if (originalFileBytes.length < headerSize) {
            showStatus('Error: File is too short to be a valid FNX JSON file.', 'danger');
            originalFileBytes = null;
            if (editor) { editor.setValue(''); editor.setOption("readOnly", true); }
            encryptButton.disabled = true; downloadButton.disabled = true;
            return;
        }

        const encryptedDataBytes = originalFileBytes.slice(headerSize);
        const decryptedDataBytes = xorCrypt(encryptedDataBytes, headerSize);
        const jsonString = new TextDecoder('utf-8').decode(decryptedDataBytes);

        console.log("Attempting to parse JSON string:", jsonString.substring(0, 200) + '...'); // Log start of JSON
        const parsedJson = JSON.parse(jsonString);
        const formattedJson = JSON.stringify(parsedJson, null, 2);

        if (editor) {
            editor.setValue(formattedJson);
            console.log("Set editor value. Attempting to set readOnly to false.");
            editor.setOption("readOnly", false);
            console.log("Editor readOnly after setting to false:", editor.getOption("readOnly"));
             editor.refresh(); // Add refresh to ensure editor updates its display
        } else {
             console.error("Editor instance is null after decryption process.");
        }

        encryptButton.disabled = false;
        downloadButton.disabled = true;
        encryptedModifiedBytes = null;
        showStatus('File decrypted successfully and loaded into the editor. You can now edit.', 'success');
    } catch (error) {
        console.error("Decryption or parsing error:", error);
        showStatus(`Error decrypting or parsing the file: ${error.message}. Please ensure it's a valid FNX JSON file.`, 'danger');
        if (editor) { editor.setValue(''); editor.setOption("readOnly", true); }
        encryptButton.disabled = true; downloadButton.disabled = true;
        originalFileBytes = null;
    }
}


/* Handle Encrypt button click */
encryptButton.addEventListener('click', () => {
    console.log("Encrypt button clicked.");
    if (!editor || !originalFileBytes) { // Ensure originalFileBytes is present to get headerSize
        showStatus('Please decrypt a file first.', 'warning');
        return;
    }
     if (editor.getOption("readOnly")) {
         showStatus('Editor is in read-only mode. Please decrypt a file to enable editing and encryption.', 'warning');
         return;
     }

    try {
        const modifiedJsonString = editor.getValue();
        console.log("Attempting to parse modified JSON string:", modifiedJsonString.substring(0, 200) + '...'); // Log start of modified JSON
        JSON.parse(modifiedJsonString); // Validate JSON

        const headerSize = determineHeaderSize(originalFileBytes);
        if (headerSize === 0) {
            // This case should ideally not happen if originalFileBytes is present and was successfully decrypted
            showStatus('Error: Could not determine file type for encryption. Please re-select the original file.', 'danger');
            downloadButton.disabled = true; encryptedModifiedBytes = null;
            return;
        }
        const modifiedContentBytes = new TextEncoder().encode(modifiedJsonString);
        const originalHeaderBytes = originalFileBytes.slice(0, headerSize);
        const encryptedDataBytes = xorCrypt(modifiedContentBytes, headerSize);
        encryptedModifiedBytes = concatUint8Arrays(originalHeaderBytes, encryptedDataBytes);

        downloadButton.disabled = false;
        showStatus('Changes encrypted successfully. Ready to download.', 'success');
         console.log("Encryption successful. encryptedModifiedBytes generated.");
    } catch (error) {
        console.error("JSON validation or encryption error:", error);
        showStatus(`Error during JSON validation or encryption: ${error.message}. Please check your JSON format.`, 'danger');
        downloadButton.disabled = true; encryptedModifiedBytes = null;
    }
});

/* Handle Download button click */
downloadButton.addEventListener('click', () => {
    console.log("Download button clicked.");
    if (!encryptedModifiedBytes) {
        showStatus('Please encrypt the changes first.', 'warning');
        return;
    }
    try {
        const blob = new Blob([encryptedModifiedBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const baseName = originalFileName.replace(/\.[^/.]+$/, "");
        a.download = `${baseName}_mod.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showStatus('Download initiated.', 'info');
         console.log(`Download link created for ${a.download}`);
    } catch (error) {
        console.error("Download error:", error);
        showStatus(`An error occurred while preparing the download: ${error.message}`, 'danger');
    }
});

/* Initialize editor and setup color picker on page load */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired. Initializing application.");
    try {
        if (window.CodeMirror) {
            setupEditor();
        } else {
            console.error("CodeMirror library not loaded on DOMContentLoaded. Editor will not be available.");
            showStatus("Error: The code editor could not be loaded. Please check your internet connection or script inclusions.", 'danger');
        }
        // Initial state of buttons
        // Decrypt button is enabled by fileInput change if editor is ready
        decryptButton.disabled = true;
        encryptButton.disabled = true;
        downloadButton.disabled = true;

        const bgColorPicker = document.getElementById('bgColorPicker');
        const body = document.body;

        if (bgColorPicker) {
            const initialColor = getComputedStyle(body).backgroundColor;
            bgColorPicker.value = rgbToHex(initialColor) || '#f4f7f6';

            bgColorPicker.addEventListener('input', (event) => {
                body.style.backgroundColor = event.target.value;
            });
            bgColorPicker.addEventListener('change', (event) => {
                localStorage.setItem('chosenBackgroundColor', event.target.value);
            });
            const savedColor = localStorage.getItem('chosenBackgroundColor');
            if (savedColor) {
                body.style.backgroundColor = savedColor;
                bgColorPicker.value = savedColor;
                console.log("Loaded background color from localStorage:", savedColor);
            }
        } else {
            console.warn("bgColorPicker element not found. Color picker functionality will be disabled.");
        }
         console.log("Application initialization complete.");
    } catch (error) {
        console.error("Error during DOMContentLoaded execution:", error);
        showStatus(`An internal error occurred during application setup: ${error.message}`, 'danger');
        decryptButton.disabled = true;
        encryptButton.disabled = true;
        downloadButton.disabled = true;
    }
});

function rgbToHex(rgb) {
    if (!rgb || rgb.startsWith('#')) return rgb;
    if (rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return 'transparent';

    const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
        const toHex = (c) => parseInt(c).toString(16).padStart(2, '0');
        return "#" + toHex(rgbMatch[1]) + toHex(rgbMatch[2]) + toHex(rgbMatch[3]);
    }
    const rgbaMatch = rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
    if (rgbaMatch) {
        const alpha = parseFloat(rgbaMatch[4]);
        const toHex = (c) => parseInt(c).toString(16).padStart(2, '0');
        if (alpha === 1) {
            return "#" + toHex(rgbaMatch[1]) + toHex(rgbaMatch[2]) + toHex(rgbaMatch[3]);
        } else {
            // For non-opaque rgba, the color picker might not represent it well without alpha.
            // Returning hex of RGB part or specific handling.
            console.warn(`rgbToHex: Alpha value ${alpha} found in ${rgb}.`);
            return "#" + toHex(rgbaMatch[1]) + toHex(rgbaMatch[2]) + toHex(rgbaMatch[3]);
        }
    }
    console.warn(`rgbToHex: Could not parse RGB string: ${rgb}. Returning original.`);
    return rgb;
}
