import { Capacitor } from "@capacitor/core";

const DEBUG_PREFIX = "[GlowUp AI Food Scan]";

export async function analyzeFoodImage({ image, foodName }) {
  const imageFile = await normalizeImageToFile(image);
  const apiUrl = getAnalyzeFoodApiUrl();
  const formData = new FormData();

  formData.append("image", imageFile, imageFile.name || "food-photo.jpg");
  formData.append("foodName", foodName || "");

  logFormData(formData, imageFile, apiUrl);

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error(`${DEBUG_PREFIX} request failed`, error);
    throw new Error(
      `Не вдалося підключитися до /api/analyze-food: ${error.message}. ${getAndroidApiHint()}`
    );
  }

  const responseText = await response.text();
  console.log(`${DEBUG_PREFIX} API response`, {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: responseText,
  });

  const result = parseJsonResponse(responseText);

  if (!response.ok) {
    throw new Error(
      result.error ||
        `API /api/analyze-food повернув ${response.status} ${response.statusText || ""}`.trim()
    );
  }

  return result;
}

function getAnalyzeFoodApiUrl() {
  const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (configuredBaseUrl) return `${configuredBaseUrl}/api/analyze-food`;

  if (Capacitor.isNativePlatform()) {
    const message =
      "Android app не має доступу до локального /api/analyze-food у packaged build. " +
      "Запусти backend у мережі й задай VITE_API_BASE_URL, наприклад http://192.168.1.20:5200.";
    console.error(`${DEBUG_PREFIX} API endpoint unavailable`, { reason: message });
    throw new Error(message);
  }

  return "/api/analyze-food";
}

async function normalizeImageToFile(image) {
  console.log(`${DEBUG_PREFIX} selected image`, describeImage(image));

  if (image instanceof File) {
    console.log(`${DEBUG_PREFIX} image size`, {
      bytes: image.size,
      type: image.type,
      name: image.name,
    });
    return image;
  }

  if (image instanceof Blob) {
    console.log(`${DEBUG_PREFIX} image size`, {
      bytes: image.size,
      type: image.type,
    });
    return new File([image], "food-photo.jpg", { type: image.type || "image/jpeg" });
  }

  if (typeof image === "string" && image.startsWith("data:image/")) {
    const file = dataUrlToFile(image, "food-photo.jpg");
    console.log(`${DEBUG_PREFIX} image size`, {
      chars: image.length,
      bytes: file.size,
      type: file.type,
      source: "data-url",
    });
    return file;
  }

  if (typeof image === "string" && Capacitor.isNativePlatform()) {
    const webviewUrl = Capacitor.convertFileSrc(image);
    const response = await fetch(webviewUrl);
    if (!response.ok) {
      throw new Error(`Не вдалося прочитати Android file URI: ${response.status}`);
    }
    const blob = await response.blob();
    console.log(`${DEBUG_PREFIX} image size`, {
      bytes: blob.size,
      type: blob.type,
      source: "capacitor-file-uri",
      uri: image,
    });
    return new File([blob], "food-photo.jpg", { type: blob.type || "image/jpeg" });
  }

  throw new Error("Фото не передано в AI аналіз або формат фото не підтримується.");
}

function dataUrlToFile(dataUrl, filename) {
  const [header, base64Data = ""] = dataUrl.split(",");
  const mimeType = header.match(/^data:(.*?);base64$/)?.[1] || "image/jpeg";
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: mimeType });
}

function describeImage(image) {
  if (image instanceof File) {
    return { kind: "File", name: image.name, type: image.type, size: image.size };
  }
  if (image instanceof Blob) {
    return { kind: "Blob", type: image.type, size: image.size };
  }
  if (typeof image === "string") {
    return {
      kind: image.startsWith("data:image/") ? "data-url" : "uri",
      length: image.length,
      preview: image.slice(0, 80),
    };
  }
  return { kind: typeof image, value: image };
}

function logFormData(formData, imageFile, apiUrl) {
  const entries = [];

  formData.forEach((value, key) => {
    entries.push({
      key,
      value:
        value instanceof File
          ? {
              kind: "File",
              name: value.name,
              type: value.type,
              size: value.size,
            }
          : value,
    });
  });

  console.log(`${DEBUG_PREFIX} FormData before upload`, {
    apiUrl,
    imageBytes: imageFile.size,
    entries,
  });
}

function parseJsonResponse(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "API returned an empty response." };
  }
}

function getAndroidApiHint() {
  if (!Capacitor.isNativePlatform()) return "";
  return "У Capacitor Android відносний /api не вказує на Vite server. Потрібен VITE_API_BASE_URL з IP backend-сервера.";
}
