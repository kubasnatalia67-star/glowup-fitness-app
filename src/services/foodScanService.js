import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { getAndroidApiHint, getAndroidDevApiBaseUrl, getApiUrl } from "./apiConfigService.js";

const DEBUG_PREFIX = "[GlowUp AI Food Scan]";
const ANALYZE_FOOD_PATH = "/api/analyze-food";

export async function analyzeFoodImage({ image, foodName, language = "uk" }) {
  if (shouldUseNativeAndroidHttp(image)) {
    return analyzeFoodImageWithNativeHttp({ image, foodName, language });
  }

  const imageFile = await normalizeImageToFile(image);
  const apiUrls = getAnalyzeFoodApiUrls();
  let lastNetworkError = null;

  for (const apiUrl of apiUrls) {
    const formData = new FormData();
    formData.append("image", imageFile, imageFile.name || "food-photo.jpg");
    formData.append("foodName", foodName || "");
    formData.append("language", language || "uk");

    logFormData(formData, imageFile, apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });
      return await parseAnalyzeFoodResponse(response, apiUrl);
    } catch (error) {
      lastNetworkError = error;
      console.error(`${DEBUG_PREFIX} request failed`, { apiUrl, error });
    }
  }

  throw new Error(
    `Не вдалося підключитися до ${apiUrls.join(" або ")}: ${
      lastNetworkError?.message || "network request failed"
    }. ${getAndroidApiHint()}`
  );
}

async function analyzeFoodImageWithNativeHttp({ image, foodName, language }) {
  console.log(`${DEBUG_PREFIX} selected image`, describeImage(image));

  const apiUrls = getAnalyzeFoodApiUrls();
  let lastNetworkError = null;

  for (const apiUrl of apiUrls) {
    try {
      console.log(`${DEBUG_PREFIX} native HTTP request`, {
        apiUrl,
        imageChars: image.length,
        approxBytes: estimateDataUrlBytes(image),
        foodName: foodName || "",
        language: language || "uk",
      });

      const response = await CapacitorHttp.post({
        url: apiUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: {
          image,
          foodName: foodName || "",
          language: language || "uk",
        },
        responseType: "json",
      });

      console.log(`${DEBUG_PREFIX} native HTTP response`, {
        apiUrl,
        status: response.status,
        data: response.data,
      });

      return parseNativeHttpResponse(response, apiUrl);
    } catch (error) {
      lastNetworkError = error;
      console.error(`${DEBUG_PREFIX} native HTTP request failed`, { apiUrl, error });
    }
  }

  throw new Error(
    `Не вдалося підключитися до ${apiUrls.join(" або ")}: ${
      lastNetworkError?.message || "native network request failed"
    }. ${getAndroidApiHint()}`
  );
}

function getAnalyzeFoodApiUrls() {
  const urls = [];

  try {
    urls.push(getApiUrl(ANALYZE_FOOD_PATH));
  } catch (error) {
    console.error(`${DEBUG_PREFIX} API endpoint unavailable`, { reason: error.message });
  }

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    const fallbackUrl = `${getAndroidDevApiBaseUrl()}${ANALYZE_FOOD_PATH}`;
    urls.push(fallbackUrl);
  }

  return [...new Set(urls)].filter(Boolean);
}

function shouldUseNativeAndroidHttp(image) {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android" &&
    typeof image === "string" &&
    image.startsWith("data:image/")
  );
}

function parseNativeHttpResponse(response, apiUrl) {
  const result =
    typeof response.data === "string" ? parseJsonResponse(response.data) : response.data || {};

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      result.error || `API ${apiUrl} повернув ${response.status}`.trim()
    );
  }

  return result;
}

async function parseAnalyzeFoodResponse(response, apiUrl) {
  const responseText = await response.text();
  console.log(`${DEBUG_PREFIX} API response`, {
    apiUrl,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: responseText,
  });

  const result = parseJsonResponse(responseText);

  if (!response.ok) {
    throw new Error(
      result.error ||
        `API ${apiUrl} повернув ${response.status} ${response.statusText || ""}`.trim()
    );
  }

  return result;
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

function estimateDataUrlBytes(dataUrl) {
  const base64Data = dataUrl.split(",")[1] || "";
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
