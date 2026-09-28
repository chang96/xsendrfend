// Shared helper: turns a FileList (from <input type="file"> or a drag-and-drop
// DataTransfer) into metadata entries and caches the File objects in window.fileMap
// so the sender (handleClick in chatbody) can stream them.
export function buildFileMetadata(fileList, noteId) {
    const metadataList = [];
    if (!fileList || fileList.length === 0) return metadataList;

    window.fileMap = window.fileMap || {};

    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        // Skip folders / zero-byte directory entries some browsers expose on drop
        if (!file || (file.size === 0 && file.type === "")) continue;

        const fileId = "file--" + (noteId || "default") + "--" + Math.random().toString(36).substring(2, 9);
        window.fileMap[fileId] = file;
        metadataList.push({
            name: file.name,
            size: file.size,
            type: file.type,
            fileId: fileId,
            noteId: noteId
        });
    }
    return metadataList;
}
