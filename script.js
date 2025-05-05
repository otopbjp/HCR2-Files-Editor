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
    0x22, 0x38, 0 ED, 0xB4, 0xAF, 0x12, 0xA8, 0x31, 0xE0, 0x25, 0x78, 0xD9, 0xF9, 0x1E, 0xF2, 0x9D,
    0x08, 0xB4, 0xF0, 0x58, 0x42, 0x8A, 0FA, 0x02, 0xE1, 0x80, 0xA1, 0x0C, 0x12, 0x69, 0xDD, 0x91,
    0x19, 0xD0, 0x1F, 0x18, 0x1F, 0x93, 0x6E, 0x24, 0xA0, 0x76, 0x07, 0x30, 0xB5, 0xD3, 0xEF, 0xC9,
    0xA6, 0x0D, 0xD9, 0xEB, 0x58, 0xFC, 0x39, 0x73, 0x80, 0x24, 0x36, 0xD4, 0xCC, 0xC3, 0x6C, 0x32,
    0x66, 0x6E, 0x2E, 0xAB, 0xE0, 0x72, 0xF6, 0x12, 0x98, 0x97, 0x78, 0x66, 0x6A, 0x49, 0xB5, 0x05,
    0xF5, 0x01, 0xB3, 0xF8, 0xAC, 0xA7, 0x03, 0x3C, 0x40, 0xA5, 0xEF, 0x97, 0x8E, 0x30, 0x56, 0x42,
    0x41, 0x7D, 0x37, 0x1E, 0x2C, 0x35, 0xD4, 0xB6, 0xD1, 0x0A, 0x45, 0x92, 0x5E, 0xE3, 0x70, 0xD9,
    0x98, 0xB1, 0xAE, 0x80, 0xD1, 0x07, 0x5A, 0x84, 0x85, 0x19, 0xDE, 0x75, 0xA8, 0xCE, 0xCE, 0x14,
    0x5E, 0xA6, 0x7E, 0x6A, 0x15, 0xC9, 0x03, 0x1A, 0x0C, 0x0E, 0x9D, 0x92, 0xFA, 0x89, 0x64, 0x55,
    0xF2, 0x5C, 0BB, 0x0A, 0x44, 0x2A, 0x78, 0x82, 0xB1, 0xFF, 0xDA, 0x1B, 0x6A, 0x1E, 0x16, 0x5A,
    0x74, 0x77, 0xAC, 0x6B, 0xFA, 0x04, 0x38, 0xD9, 0xF7, 0x04, 0x94, 0x2D, 0xB4, 0x0E, 0x2F, 0x83,
    0xAF, 0xFB, 0xA9, 0xE7, 0x6F, 0x3B, 0x48, 0xEC, 0xB0, 0x71, 0x4C, 0x85, 0x06, 0xA5, 0xF2, 0xF2,
    0xBB, 0x5F, 0x56, 0x98, 0x8F, 0xFC, 0x54, 0x4F, 0xBD, 0xA4, 0x0A, 0x71, 0xAF, 0xE2, 0x8D, 0xBF,
    0x28, 0xC5, 0x99, 0xE2, 0x7E, 0xA8, 0x4F, 0x5D, 0x80, 0x12, 0x12, 0x9B, 0x62, 0xE3, 0x1B, 0x1D,
    0x8F, 0xA3, 0xE9, 0xE9, 0xC4, 0xF4, 0x32
];

/* XOR operation function (modified to handle header size) */
// dataBytes: The byte array to XOR (should be the data *after* the header)
// headerSize: The size of the header that was *removed* before passing to this function
function xorCrypt(dataBytes, headerSize) {
    const dataLength = dataBytes.length;
    const keyLength = key.length;
    const outputBytes = new Uint8Array(dataLength);

    for (let i = 0; i < dataLength; i++) {
        // The key index depends on the original position in the file
        // which is i (current index in dataBytes) + headerSize (size of skipped header)
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
    // Check if CodeMirror is available before trying to use it
    if (window.CodeMirror) {
        if (editor) {
            editor.toTextArea(); // Clean up previous instance
        }
        editorContainer.innerHTML = ''; // Clear container
        editor = CodeMirror(editorContainer, {
            mode: { name: "javascript", json: true },
            theme: "material-darker",
            lineNumbers: true,
            lineWrapping: true,
            readOnly: true,
            gutters: ["CodeMirror-lint-markers"],
            lint: true
        });
        editor.setSize("100%", "100%");
        console.log("CodeMirror editor setup complete."); // Log success to console
    } else {
        console.error("CodeMirror library is not loaded. Cannot setup editor.");
        // Show a clear message to the user if the editor fails to load
        editorContainer.innerHTML = '<div class="alert alert-danger" role="alert"><i class="bi bi-x-octagon-fill me-2"></i>Error: The code editor could not be loaded. Please check your internet connection.</div>';
    }
}

/* Determine header size based on file bytes (only checks for FNX) */
function determineHeaderSize(fileBytes) {
     if (!fileBytes || fileBytes.length < 4) {
         return 0; // Cannot be a valid FNX file if too short
     }

    // Check for "FNX" header bytes (ASCII values)
    if (fileBytes[0] === 0x46 && // 'F'
        fileBytes[1] === 0x4E && // 'N'
        fileBytes[2] === 0x58)
    {
        return 4; // "FNX" + 1 byte header
    } else {
        return 0; // Not an FNX file (unsupported type for this tool)
    }
}

/* Simple function to display status messages */
function showStatus(message, type = 'info') {
    const alertClass = {
        'info': 'alert-info',
        'success': 'alert-success',
        'warning': 'alert-warning',
        'danger': 'alert-danger'
    }[type];

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
    statusMessages.innerHTML = ''; // Clear previous messages
    statusMessages.appendChild(messageDiv);
     console.log(`Status [${type.toUpperCase()}]: ${message}`); // Also log to console
}


/* Handle file input change */
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    statusMessages.innerHTML = ''; // Clear previous status messages
    if (file) {
        try { // Add a try...catch block around the file processing logic
            originalFileName = file.name;
            fileNameDisplay.textContent = `Selected file: ${originalFileName}`; // Update file name display

            // Ensure editor is set up before enabling decryption
            if (window.CodeMirror) {
               setupEditor(); // Try to set up the editor
               if (editor) { // Check if setupEditor was successful
                    decryptButton.disabled = false; // Enable decrypt button only if editor is ready
                    editor.setValue(''); // Clear previous editor content
                    editor.setOption("readOnly", true); // Set editor to read-only initially
               } else {
                    // setupEditor failed but didn't throw, handle gracefully
                    showStatus("Error: Code editor initialization failed.", 'danger');
                     decryptButton.disabled = true;
               }
            } else {
                showStatus("Error: The code editor library is not available. Cannot process file.", 'danger');
                decryptButton.disabled = true; // Keep decrypt disabled if editor not available
                 // Clear editor area or show message if CodeMirror is missing (handled in setupEditor)
            }

            encryptButton.disabled = true; // Disable encrypt until decrypted
            downloadButton.disabled = true; // Disable download until encrypted
            originalFileBytes = null; // Clear previous file data
            encryptedModifiedBytes = null; // Clear previous encrypted data

            console.log(`File selected: ${originalFileName}`); // Log file selection


        } catch (error) {
             // Catch any unexpected errors during file selection processing
             console.error("Error during file selection processing:", error);
             showStatus(`An error occurred while processing the file selection: ${error.message}`, 'danger');
             // Reset UI elements to initial state on error
             fileNameDisplay.textContent = 'No file selected.';
             decryptButton.disabled = true;
             encryptButton.disabled = true;
             downloadButton.disabled = true;
             if (editor) { // Clear editor if it was created
                 editor.setValue('');
                 editor.setOption("readOnly", true);
             }
             originalFileBytes = null;
             encryptedModifiedBytes = null;
        }
    } else {
        // Reset UI if no file is selected (e.g., user cancels the file picker)
        originalFileName = '';
        fileNameDisplay.textContent = 'No file selected.';
        decryptButton.disabled = true;
        if (editor) { // Clear editor if it exists
            editor.setValue('');
            editor.setOption("readOnly", true); // Set editor back to read-only
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
    // Check if original file bytes are available and editor is ready
    if (!originalFileBytes || !editor || !window.CodeMirror) {
         showStatus('Please select a file first and ensure the editor is ready.', 'warning');
        return;
    }


    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            originalFileBytes = new Uint8Array(e.target.result); // Use bytes from the loaded file

            const headerSize = determineHeaderSize(originalFileBytes);

            if (headerSize === 0) {
                 showStatus('Error: Only FNX JSON files are supported by this editor.', 'danger');
                 originalFileBytes = null; // Clear bytes on error
                 editor.setValue('');
                 editor.setOption("readOnly", true);
                 encryptButton.disabled = true;
                 downloadButton.disabled = true;
                 return;
            }

            if (originalFileBytes.length < headerSize) {
                 showStatus('Error: File is too short to be a valid FNX JSON file.', 'danger');
                 originalFileBytes = null; // Clear bytes on error
                 editor.setValue('');
                 editor.setOption("readOnly", true);
                 encryptButton.disabled = true;
                 downloadButton.disabled = true;
                 return;
            }

            // Extract header and encrypted data bytes
            const headerBytes = originalFileBytes.slice(0, headerSize);
            const encryptedDataBytes = originalFileBytes.slice(headerSize);

            // Decrypt only the data bytes, providing the headerSize to xorCrypt
            const decryptedDataBytes = xorCrypt(encryptedDataBytes, headerSize);

            // Decode the decrypted data bytes as JSON string
            const jsonString = new TextDecoder('utf-8').decode(decryptedDataBytes);

            // Attempt to parse JSON to validate and format
            const parsedJson = JSON.parse(jsonString);
            const formattedJson = JSON.stringify(parsedJson, null, 2);

            editor.setValue(formattedJson); // Load JSON into editor
            editor.setOption("readOnly", false); // Make editor editable
            encryptButton.disabled = false; // Enable encrypt button
            downloadButton.disabled = true; // Disable download until encrypted
            encryptedModifiedBytes = null; // Reset encrypted bytes on new decryption
            showStatus('File decrypted successfully and loaded into the editor.', 'success');

        } catch (error) {
            console.error("Decryption or parsing error:", error);
            showStatus(`Error decrypting or parsing the file: ${error.message}. Please ensure it's a valid FNX JSON file.`, 'danger');
            editor.setValue('');
            editor.setOption("readOnly", true);
            encryptButton.disabled = true;
            downloadButton.disabled = true;
             originalFileBytes = null; // Clear bytes on error
        }
    };
     // Read the selected file's content
    const fileToRead = fileInput.files[0];
     if (fileToRead) {
        reader.readAsArrayBuffer(fileToRead);
     } else {
         // This case should theoretically not happen if decryptButton is enabled, but for safety:
         showStatus('No file selected to decrypt.', 'warning');
     }
});

/* Handle Encrypt button click */
encryptButton.addEventListener('click', () => {
    // Check if editor is ready, original file bytes are available, and editor is not read-only
    if (!editor || !originalFileBytes || editor.getOption("readOnly")) {
        showStatus('Please decrypt and edit a file first.', 'warning');
        return;
    }

    try {
        const modifiedJsonString = editor.getValue();
        JSON.parse(modifiedJsonString); // Validate JSON

        // Determine headerSize from original file bytes (should be 4 for supported files)
        const headerSize = determineHeaderSize(originalFileBytes);

         if (headerSize === 0) {
             // This case should ideally not happen if decrypt was successful, but included for safety
              showStatus('Error: Could not determine file type for encryption. Please re-select the original file.', 'danger');
              downloadButton.disabled = true;
              encryptedModifiedBytes = null;
              return;
          }

        // Encode the modified JSON string to bytes
        const modifiedContentBytes = new TextEncoder().encode(modifiedJsonString);

        // Get the original header bytes
        const originalHeaderBytes = originalFileBytes.slice(0, headerSize);
        const dataToEncrypt = modifiedContentBytes; // We will XOR just the data part

        // Encrypt the modified content bytes, using headerSize for key index offset
        const encryptedDataBytes = xorCrypt(dataToEncrypt, headerSize);

        // Prepend the original header bytes to the encrypted data bytes
        encryptedModifiedBytes = concatUint8Arrays(originalHeaderBytes, encryptedDataBytes);

        downloadButton.disabled = false; // Enable download button
        showStatus('Changes encrypted successfully. Ready to download.', 'success');

    } catch (error) {
        console.error("JSON validation or encryption error:", error);
        showStatus(`Error during JSON validation or encryption: ${error.message}. Please check your JSON format.`, 'danger');
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
        // Create a Blob from the encrypted bytes
        const blob = new Blob([encryptedModifiedBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob); // Create a download URL
        const a = document.createElement('a'); // Create a link element
        a.style.display = 'none'; // Hide the link
        a.href = url; // Set the download URL
        // Use the original file name but append _mod and change extension to .json
        const baseName = originalFileName.replace(/\.[^/.]+$/, ""); // Get file name without extension
        a.download = `${baseName}_mod.json`; // Set download file name
        document.body.appendChild(a); // Append link to body
        a.click(); // Simulate click to trigger download
        window.URL.revokeObjectURL(url); // Clean up the URL object
        document.body.removeChild(a); // Remove the link
        showStatus('Download initiated.', 'info');

    } catch (error) {
        console.error("Download error:", error);
        showStatus(`An error occurred while preparing the download: ${error.message}`, 'danger');
    }
});

/* Initialize editor and setup color picker on page load */
document.addEventListener('DOMContentLoaded', () => {
    try { // Catch potential errors during DOMContentLoaded execution

        // --- Editor Setup ---
        // Check if CodeMirror is available before setting up the editor initially
        if (window.CodeMirror) {
            setupEditor(); // Setup the editor on page load
            // Initial state of buttons depends on editor availability
            decryptButton.disabled = true;
            encryptButton.disabled = true;
            downloadButton.disabled = true;
        } else {
             console.error("CodeMirror library not loaded on DOMContentLoaded. Editor will not be available.");
             showStatus("Error: The code editor could not be loaded. Please check your internet connection.", 'danger');
             // Ensure buttons that depend on the editor are disabled
             decryptButton.disabled = true;
             encryptButton.disabled = true;
             downloadButton.disabled = true;
             // Display message in editor area (handled in setupEditor now)
         }

        // --- Color Picker Setup ---
        const bgColorPicker = document.getElementById('bgColorPicker');
        const body = document.body;

        // Set initial color picker value to the current body background color
        const initialColor = getComputedStyle(body).backgroundColor;
        bgColorPicker.value = rgbToHex(initialColor) || '#f4f7f6'; // Default to CSS color if conversion fails


        // Event listener for the color picker (live update)
        bgColorPicker.addEventListener('input', (event) => {
            body.style.backgroundColor = event.target.value;
        });

        // Optional: Save the chosen color to localStorage so it persists across visits
        // This is typically triggered on the 'change' event (when picker is closed)
        bgColorPicker.addEventListener('change', (event) => {
            localStorage.setItem('chosenBackgroundColor', event.target.value);
        });

        // Optional: Load the saved color from localStorage when the page loads
        const savedColor = localStorage.getItem('chosenBackgroundColor');
        if (savedColor) {
            body.style.backgroundColor = savedColor;
            bgColorPicker.value = savedColor;
             console.log("Loaded background color from localStorage:", savedColor);
        }


    } catch (error) {
        console.error("Error during DOMContentLoaded execution:", error);
        showStatus(`An internal error occurred during application setup: ${error.message}`, 'danger');
         // Ensure all main buttons are disabled if setup fails
         decryptButton.disabled = true;
         encryptButton.disabled = true;
         downloadButton.disabled = true;
         // Clear editor area or show message (handled in setupEditor if it was called)
    }
});

// Helper function to convert RGB to Hex (basic implementation)
// Needed because getComputedStyle might return RGB
function rgbToHex(rgb) {
    // Check if it's already in hex format or invalid
    if (!rgb || rgb.startsWith('#')) {
        return rgb;
    }

     // Handle explicit transparent color string
     if (rgb === 'transparent') {
         return 'transparent';
     }

     // Handle rgba(0, 0, 0, 0) case specifically if needed, though 'transparent' might cover it
      if (rgb === 'rgba(0, 0, 0, 0)') {
          return 'transparent'; // Or '#00000000' if you need hex with alpha
      }


    // Match standard rgb(r, g, b) format
    const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
        const toHex = (c) => {
            const hex = parseInt(c).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return "#" + toHex(rgbMatch[1]) + toHex(rgbMatch[2]) + toHex(rgbMatch[3]);
    }

    // Try matching rgba(r, g, b, a) format and convert if alpha is 1
     const rgbaMatch = rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
     if (rgbaMatch && parseFloat(rgbaMatch[4]) === 1) {
          const toHex = (c) => {
              const hex = parseInt(c).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
          };
          return "#" + toHex(rgbaMatch[1]) + toHex(rgbaMatch[2]) + toHex(rgbaMatch[3]);
     }

    // Return null or original value if format is not recognized
    console.warn("Could not convert color to hex:", rgb); // Log conversion failures
    return null; // Or return original value: rgb;
}
