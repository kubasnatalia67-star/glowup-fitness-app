import { Capacitor } from "@capacitor/core";

export const API_BASE_URL_STORAGE_KEY = "glowupApiBaseUrl";

const DEFAULT_PRODUCTION_API_BASE_URL = "https://glowup-fitness-app.onrender.com";
const LEGACY_DEV_API_BASE_URLS = new Set([
  "http://192.168.0.104:5200",
  "http://192.168.0.185:5200",
]);
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
    LEGACY_DEV_API_BASE_URLS.has(storedBaseUrl) ||
    (getDefaultApiBaseUrl().startsWith("https://") && isPrivateDevApiBaseUrl(storedBaseUrl))
  ) {
    localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
    return "";
  }

  return storedBaseUrl;
}

export function getConfiguredApiBaseUrl() {
  return normalizeApiBaseUrl(
    getStoredApiBaseUrl() || ENV_API_BASE_URL || DEFAULT_PRODUCTION_API_BASE_URL
  );
}

export function getDefaultApiBaseUrl() {
  return ENV_API_BASE_URL || DEFAULT_PRODUCTION_API_BASE_URL;
}

export function getApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBaseUrl = getConfiguredApiBaseUrl();

  if (configuredBaseUrl) return `${configuredBaseUrl}${normalizedPath}`;
  if (!Capacitor.isNativePlatform()) return normalizedPath;

  throw new Error(
    "Android app needs a reachable API backend. Set API Base URL in GlowUp settings."
  );
}

export function getAndroidApiHint() {
  if (!Capacitor.isNativePlatform()) return "";
  return `Current API backend: ${getConfiguredApiBaseUrl() || DEFAULT_PRODUCTION_API_BASE_URL}.`;
}
