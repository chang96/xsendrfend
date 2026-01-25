/**
 * Converts a File object to a Base64 string.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} A promise that resolves with the Base64 string.
 */
const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

/**
 * Converts a Data URL string to a File object.
 * @param {string} dataurl - The Data URL string (e.g. "data:image/png;base64,...").
 * @param {string} filename - The name to give the file.
 * @returns {File} The created File object.
 */
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

/**
 * Triggers a download of a Base64 encoded file in the browser.
 * @param {string} contentType - The MIME type of the file.
 * @param {string} base64Data - The Base64 data string.
 * @param {string} fileName - The name for the downloaded file.
 */
function downloadBase64File(contentType, base64Data, fileName) {
  // Ensure we don't double-prefix if the data already contains the header
  const prefix = `data:${contentType};base64,`;
  const linkSource = base64Data.startsWith('data:') ? base64Data : `${prefix}${base64Data}`;

  const downloadLink = document.createElement("a");
  downloadLink.href = linkSource;
  downloadLink.download = fileName;
  downloadLink.click();
  downloadLink.remove(); // Cleanup
}

/**
 * Chunks a message and sends it via the provided send function.
 * Optimized for WebRTC Data Channels (using 16KB chunks).
 * @param {string} message - The string message to send.
 * @param {function(Uint8Array):void} sendChunk - Callback to send each chunk.
 */
function sendMessage(message, sendChunk) {
  const CHUNK_SIZE = 16 * 1024; // 16KB chunks are safe for most WebRTC implementations
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  // If message is empty, return early
  if (encoded.length === 0) return;

  for (let i = 0; i < encoded.length; i += CHUNK_SIZE) {
    const chunk = encoded.slice(i, i + CHUNK_SIZE);
    sendChunk(chunk);
  }
}

export {
  toBase64,
  dataURLtoFile,
  downloadBase64File,
  sendMessage
}