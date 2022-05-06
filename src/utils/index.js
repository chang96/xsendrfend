const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});


function dataURLtoFile(dataurl, filename) {
 
    var arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
        
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    console.log(mime)
    // console.log(new File([u8arr], filename, {type:mime}))
    return {type:mime} //new File([u8arr], filename, {type:mime});
}

function downloadBase64File(contentType, base64Data, fileName) {
    const linkSource = `data:${contentType};base64,${base64Data}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
}

function sendMessage(message, sendChunk) {
  const decoder = new TextDecoder("utf-8");
const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 1 });
let result = "";
const writableStream = new WritableStream({
// Implement the sink
write(chunk) {
  return new Promise((resolve, reject) => {
    var buffer = new ArrayBuffer(1);
    var view = new Uint8Array(buffer);
    view[0] = chunk;
    var decoded = decoder.decode(view, { stream: true });
  //   var listItem = document.createElement('li');
  //   listItem.textContent = "Chunk decoded: " + decoded;
  //   list.appendChild(listItem);
  //   result += decoded;
    resolve();
  });
},
close() {
 
},
abort(err) {
  console.log("Sink error:", err);
}
}, queuingStrategy);
  // defaultWriter is of type WritableStreamDefaultWriter

  const defaultWriter = writableStream.getWriter();
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message, { stream: true });
  encoded.forEach((chunk) => {
    defaultWriter.ready
      .then(() => {
          sendChunk(chunk)
        return defaultWriter.write(chunk);

      })
      .then(() => {
        console.log("Chunk written to sink.");
      })
      .catch((err) => {
        console.log("Chunk error:", err);
      });
  });
  // Call ready again to ensure that all chunks are written
  //   before closing the writer.
  defaultWriter.ready
    .then(() => {
      defaultWriter.close();
    })
    .then(() => {
      console.log("All chunks written");
    })
    .catch((err) => {
      console.log("Stream error:", err);
    });
}

export {
  toBase64,
  dataURLtoFile,
  downloadBase64File,
  sendMessage
}

export {
    toBase64,
    dataURLtoFile,
    downloadBase64File
}