/* Global variables */
let editor = null;
let originalFileBytes = null;
let originalFileName = 'savegame_mod.dat';
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
    0xF5, 0x01, 0xB3, 0xF8, 0xAC, 0xA7, 0x03, 0x3C, 0x40, 0xA5, 0xEF, 0x97, 0x8E, 0x30, 0x56, 0x42,
    0x41, 0x7D, 0x37, 0x1E, 0x2C, 0x35, 0xD4, 0xB6, 0xD1, 0x0A, 0x45, 0x92, 0x5E, 0xE3, 0x70, 0xD9,
    0x98, 0xB1, 0xAE, 0x80, 0xD1, 0x07, 0x5A, 0x84, 0x85, 0x19, 0xDE, 0x75, 0xA8, 0xCE, 0xCE, 0x14,
    0x5E, 0xA6, 0x7E, 0x6A, 0x15, 0xC9, 0x03, 0x1A, 0x0C, 0x0E, 0x9D, 0x92, 0xFA, 0x89, 0x64, 0x55,
    0xF2, 0x5C, 0xBB, 0x0A, 0x44, 0x2A, 0x78, 0x82, 0xB1, 0xFF, 0xDA, 0x1B, 0x6A, 0x1E, 0x16, 0x5A,
    0x74, 0x77, 0xAC, 0x6B, 0xFA, 0x04, 0x38, 0xD9, 0xF7, 0x04, 0x94, 0x2D, 0xB4, 0x0E, 0x2F, 0x83,
    0xAF, 0xFB, 0xA9, 0xE7, 0x6F, 0x3B, 0x48, 0xEC, 0xB0, 0x71, 0x4C, 0x85, 0x06, 0xA5, 0xF2, 0xF2,
    0xBB, 0x5F, 0x56, 0x98, 0x8F, 0xFC, 0x54, 0x4F, 0xBD, 0xA4, 0x0A, 0x71, 0xAF, 0xE2, 0x8D, 0xBF,
    0x28, 0xC5, 0x99, 0xE2, 0x7E, 0xA8, 0x4F, 0x5D, 0x80, 0x12, 0x12, 0x9B, 0x62, 0xE3, 0x1B, 0x1D,
    0x8F, 0xA3, 0xE9, 0xE9, 0xC4, 0xF4, 0x32
];

/* Function to display status messages */
function showStatus(message, type = 'info') {
    const alertClass = `alert-${type}`;
    const iconClass = {
        'info': 'bi-info-circle-fill',
        'success': 'bi-check-circle-fill',
        'warning': 'bi-exclamation-triangle-fill',
        'danger': 'bi-x-octagon-fill'
    }[type];

    const messageDiv = document.createElement('div');
    messageDiv.className = `alert ${alertClass} alert-dismissible fade show d-flex align-items-center`;
    messageDiv.role = 'alert';
    messageDiv.innerHTML = `
        <i class="bi ${iconClass} me-3 fs-5"></i>
        <div>${message}</div>
        <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    /* Clear previous messages before adding a new one for cleaner feedback */
    statusMessages.innerHTML = '';
    statusMessages.appendChild(messageDiv);
}

/* XOR operation function */
function xorCrypt(dataBytes) {
    const dataLength = dataBytes.length;
    const keyLength = key.length;
    const outputBytes = new Uint8Array(dataLength);

    for (let i = 0; i < dataLength; i++) {
        if (i < 3) {
            outputBytes[i] = dataBytes[i];
        } else {
            const keyIndex = (i - 3) % keyLength;
            outputBytes[i] = dataBytes[i] ^ key[keyIndex];
        }
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
    if (editor) {
        editor.toTextArea();
    }
    editorContainer.innerHTML = '';
    editor = CodeMirror(editorContainer, {
        mode: { name: "javascript", json: true },
        theme: "material-darker",
        lineNumbers: true,
        lineWrapping: true,
        readOnly: true,
        gutters: ["CodeMirror-lint-markers"],
        lint: true /* Requires addon if you want JSON linting */
    });
    editor.setSize("100%", "100%");
}

/* Handle file input change */
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    statusMessages.innerHTML = ''; /* Clear status on new file selection */
    if (file) {
        originalFileName = file.name;
        fileNameDisplay.textContent = `Selected file: ${originalFileName}`;
        decryptButton.disabled = false;
        setupEditor(); /* Reset editor */
        encryptButton.disabled = true;
        downloadButton.disabled = true;
        originalFileBytes = null;
        encryptedModifiedBytes = null;
    } else {
        fileNameDisplay.textContent = 'No file selected.';
        decryptButton.disabled = true;
        if (editor) editor.setValue('');
    }
});

/* Handle Decrypt button click */
decryptButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) {
        showStatus('Please select a file first.', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            originalFileBytes = new Uint8Array(e.target.result);
            if (originalFileBytes.length <= 3) {
                 throw new Error("File is too short to be a valid save file.");
            }
            const decryptedBytesWithHeader = xorCrypt(originalFileBytes);
            const jsonDataBytes = decryptedBytesWithHeader.slice(3);
            const jsonString = new TextDecoder('utf-8').decode(jsonDataBytes);

             const parsedJson = JSON.parse(jsonString);
             const formattedJson = JSON.stringify(parsedJson, null, 2);

            editor.setValue(formattedJson);
            editor.setOption("readOnly", false);
            encryptButton.disabled = false;
            downloadButton.disabled = true;
            encryptedModifiedBytes = null;
            showStatus('File decrypted successfully and loaded into the editor.', 'success');
        } catch (error) {
            console.error("Decryption or parsing error:", error);
            showStatus(`Error decrypting or parsing the file. Is it a valid HCR2 save file (v1.33 or earlier)? Details: ${error.message}`, 'danger');
            editor.setValue('');
            editor.setOption("readOnly", true);
            encryptButton.disabled = true;
            downloadButton.disabled = true;
        }
    };
    reader.onerror = () => {
        showStatus('Error reading the file.', 'danger');
        editor.setValue('');
        editor.setOption("readOnly", true);
        encryptButton.disabled = true;
        downloadButton.disabled = true;
    };
    reader.readAsArrayBuffer(file);
});

/* Handle Encrypt button click */
encryptButton.addEventListener('click', () => {
    if (!editor || !originalFileBytes) {
        showStatus('Please decrypt a file first.', 'warning');
        return;
    }

    try {
        const modifiedJsonString = editor.getValue();
        JSON.parse(modifiedJsonString); /* Validate JSON before proceeding */

        const modifiedContentBytes = new TextEncoder().encode(modifiedJsonString);
        const originalHeaderBytes = originalFileBytes.slice(0, 3);
        const dataToEncrypt = concatUint8Arrays(originalHeaderBytes, modifiedContentBytes);

        encryptedModifiedBytes = xorCrypt(dataToEncrypt);

        downloadButton.disabled = false;
        showStatus('Changes encrypted successfully. Ready to download.', 'success');

    } catch (error) {
        console.error("JSON validation or encryption error:", error);
        showStatus(`Error: The modified content is not valid JSON or an encryption error occurred. Details: ${error.message}`, 'danger');
        downloadButton.disabled = true;
        encryptedModifiedBytes = null;
    }
});

/* Handle Download button click */
downloadButton.addEventListener('click', () => {
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
        a.download = `${baseName}_mod.dat`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showStatus('Download initiated.', 'info');

        /* Optionally reset state after successful download */
        /*
        fileInput.value = '';
        fileNameDisplay.textContent = 'No file selected.';
        setupEditor();
        decryptButton.disabled = true;
        encryptButton.disabled = true;
        downloadButton.disabled = true;
        originalFileBytes = null;
        encryptedModifiedBytes = null;
        */

    } catch (error) {
        console.error("Download error:", error);
        showStatus(`An error occurred while preparing the download. Details: ${error.message}`, 'danger');
    }
});

/* Initialize editor on page load */
document.addEventListener('DOMContentLoaded', setupEditor);
