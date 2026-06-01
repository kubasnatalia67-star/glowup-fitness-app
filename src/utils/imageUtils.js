export const MAX_IMAGE_SIZE = 1200;
export const IMAGE_QUALITY = 0.75;
export const MAX_LOCAL_PHOTO_CHARS = 900_000;

export async function compressImageFile(
  file,
  { maxSize = MAX_IMAGE_SIZE, quality = IMAGE_QUALITY } = {}
) {
  if (!file) return "";

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    return drawImageToJpeg(image, maxSize, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function compressCanvasToDataUrl(
  sourceCanvas,
  { maxSize = MAX_IMAGE_SIZE, quality = IMAGE_QUALITY } = {}
) {
  if (!sourceCanvas) return "";
  return drawImageToJpeg(sourceCanvas, maxSize, quality);
}

export function keepLocalPhoto(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return "";
  return dataUrl.length <= MAX_LOCAL_PHOTO_CHARS ? dataUrl : "";
}

export function stripLargePhotosFromDiary(items) {
  return items.map((item) => ({
    ...item,
    photo: keepLocalPhoto(item.photo),
  }));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = src;
  });
}

function drawImageToJpeg(source, maxSize, quality) {
  const width = source.videoWidth || source.naturalWidth || source.width || maxSize;
  const height = source.videoHeight || source.naturalHeight || source.height || maxSize;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(source, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", quality);
}
