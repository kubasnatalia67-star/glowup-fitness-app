import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { getAndroidApiHint, getApiUrl } from "./apiConfigService.js";

const DEBUG_PREFIX = "[GlowUp Body Analysis]";

export async function analyzeBodyImage({ image, images = {}, profile, language = "uk" }) {
  const normalizedImages = normalizeBodyImages(images, image);
  const imageCount = Object.values(normalizedImages).filter(Boolean).length;

  if (shouldUseNativeAndroidHttp(image) || imageCount > 1) {
    return analyzeBodyImageWithNativeHttp({ image, images: normalizedImages, profile, language });
  }

  const imageFile = await normalizeImageToFile(image);
  const apiUrl = getBodyAnalysisApiUrl();
  const formData = new FormData();

  formData.append("image", imageFile, imageFile.name || "body-photo.jpg");
  formData.append("profile", JSON.stringify(profile || {}));
  formData.append("language", language);

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

async function analyzeBodyImageWithNativeHttp({ image, images = {}, profile, language = "uk" }) {
  const apiUrl = getBodyAnalysisApiUrl();
  const normalizedImages = normalizeBodyImages(images, image);

  console.log(`${DEBUG_PREFIX} native HTTP request`, {
    apiUrl,
    image: describeImage(image),
    angles: Object.entries(normalizedImages)
      .filter(([, value]) => Boolean(value))
      .map(([angle, value]) => ({ angle, approxBytes: estimateDataUrlBytes(value) })),
    approxBytes: estimateDataUrlBytes(image),
    profile,
  });

  try {
    const response = await CapacitorHttp.post({
      url: apiUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: {
        image,
        images: normalizedImages,
        profile: profile || {},
        language,
      },
      responseType: "json",
    });

    console.log(`${DEBUG_PREFIX} native HTTP response`, {
      status: response.status,
      data: response.data,
    });

    const result =
      typeof response.data === "string" ? parseJsonResponse(response.data) : response.data || {};

    if (response.status < 200 || response.status >= 300) {
      throw new Error(result.error || `API /api/analyze-body повернув ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error(`${DEBUG_PREFIX} native request failed`, error);
    throw new Error(
      `Не вдалося підключитися до /api/analyze-body: ${error.message}. ${getAndroidApiHint()}`
    );
  }
}

function normalizeBodyImages(images, fallbackImage) {
  const source = images && typeof images === "object" ? images : {};
  return {
    front: source.front || fallbackImage || "",
    side: source.side || "",
    back: source.back || "",
  };
}

function getBodyAnalysisApiUrl() {
  try {
    return getApiUrl("/api/analyze-body");
  } catch (error) {
    const message = error.message;
    console.error(`${DEBUG_PREFIX} API endpoint unavailable`, { reason: message });
    throw new Error(message);
  }
}

function shouldUseNativeAndroidHttp(image) {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android" &&
    typeof image === "string" &&
    image.startsWith("data:image/")
  );
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

function estimateDataUrlBytes(dataUrl) {
  const base64Data = String(dataUrl || "").split(",")[1] || "";
  const padding = base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64Data.length * 3) / 4) - padding);
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
