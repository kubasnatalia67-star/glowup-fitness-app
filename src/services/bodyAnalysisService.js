import { Capacitor } from "@capacitor/core";

const DEBUG_PREFIX = "[GlowUp Body Analysis]";

export async function analyzeBodyImage({ image, profile }) {
  const imageFile = await normalizeImageToFile(image);
  const apiUrl = getBodyAnalysisApiUrl();
  const formData = new FormData();

  formData.append("image", imageFile, imageFile.name || "body-photo.jpg");
  formData.append("profile", JSON.stringify(profile || {}));

  console.log(`${DEBUG_PREFIX} FormData before upload`, {
    apiUrl,
    imageBytes: imageFile.size,
    profile,
  });

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error(`${DEBUG_PREFIX} request failed`, error);
    throw new Error(
      `Не вдалося підключитися до /api/analyze-body: ${error.message}. ${getAndroidApiHint()}`
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
        `API /api/analyze-body повернув ${response.status} ${response.statusText || ""}`.trim()
    );
  }

  return result;
}

function getBodyAnalysisApiUrl() {
  const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (configuredBaseUrl) return `${configuredBaseUrl}/api/analyze-body`;

  if (Capacitor.isNativePlatform()) {
    const message =
      "Android app не має доступу до локального /api/analyze-body у packaged build. " +
      "Запусти backend у мережі й задай VITE_API_BASE_URL, наприклад http://192.168.1.20:5200.";
    console.error(`${DEBUG_PREFIX} API endpoint unavailable`, { reason: message });
    throw new Error(message);
  }

  return "/api/analyze-body";
}

async function normalizeImageToFile(image) {
  console.log(`${DEBUG_PREFIX} selected image`, describeImage(image));

  if (image instanceof File) {
    return image;
  }

  if (image instanceof Blob) {
    return new File([image], "body-photo.jpg", { type: image.type || "image/jpeg" });
  }

  if (typeof image === "string" && image.startsWith("data:image/")) {
    return dataUrlToFile(image, "body-photo.jpg");
  }

  if (typeof image === "string" && Capacitor.isNativePlatform()) {
    const response = await fetch(Capacitor.convertFileSrc(image));
    if (!response.ok) {
      throw new Error(`Не вдалося прочитати Android file URI: ${response.status}`);
    }
    const blob = await response.blob();
    return new File([blob], "body-photo.jpg", { type: blob.type || "image/jpeg" });
  }

  throw new Error("Фото тіла не передано або формат фото не підтримується.");
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
