import { Capacitor } from "@capacitor/core";

export const API_BASE_URL_STORAGE_KEY = "glowupApiBaseUrl";

const ANDROID_DEV_API_BASE_URL = "http://192.168.0.104:5200";
const LEGACY_ANDROID_DEV_API_BASE_URLS = new Set(["http://192.168.0.185:5200"]);
const ENV_API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || "");

export function normalizeApiBaseUrl(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}

function isPrivateDevApiBaseUrl(value = "") {
  return /^http:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(
    value
  );
}

export function getStoredApiBaseUrl() {
  if (typeof localStorage === "undefined") return "";
  const storedBaseUrl = normalizeApiBaseUrl(localStorage.getItem(API_BASE_URL_STORAGE_KEY) || "");

  if (
    LEGACY_ANDROID_DEV_API_BASE_URLS.has(storedBaseUrl) ||
    (ENV_API_BASE_URL.startsWith("https://") && isPrivateDevApiBaseUrl(storedBaseUrl))
  ) {
    localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
    return "";
  }

  return storedBaseUrl;
}

export function getConfiguredApiBaseUrl() {
  const configuredBaseUrl = normalizeApiBaseUrl(
    getStoredApiBaseUrl() || ENV_API_BASE_URL || ""
  );

  if (configuredBaseUrl) return configuredBaseUrl;
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    return ANDROID_DEV_API_BASE_URL;
  }

  return "";
}

export function getAndroidDevApiBaseUrl() {
  return ANDROID_DEV_API_BASE_URL;
}

export function getApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBaseUrl = getConfiguredApiBaseUrl();

  if (configuredBaseUrl) return `${configuredBaseUrl}${normalizedPath}`;
  if (!Capacitor.isNativePlatform()) return normalizedPath;

  throw new Error(
    "Android app не має доступу до локального /api у packaged build. " +
      `Запусти backend у мережі й задай API Base URL у налаштуваннях, наприклад ${ANDROID_DEV_API_BASE_URL}.`
  );
}

export function getAndroidApiHint() {
  if (!Capacitor.isNativePlatform()) return "";
  return (
    "У Capacitor Android відносний /api не вказує на Vite server. " +
    `Задай API Base URL у налаштуваннях GlowUp або VITE_API_BASE_URL перед build. Поточний fallback: ${ANDROID_DEV_API_BASE_URL}.`
  );
}
