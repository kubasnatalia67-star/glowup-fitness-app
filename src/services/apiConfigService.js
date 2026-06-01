import { Capacitor } from "@capacitor/core";

export const API_BASE_URL_STORAGE_KEY = "glowupApiBaseUrl";

export function normalizeApiBaseUrl(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function getStoredApiBaseUrl() {
  if (typeof localStorage === "undefined") return "";
  return normalizeApiBaseUrl(localStorage.getItem(API_BASE_URL_STORAGE_KEY) || "");
}

export function getConfiguredApiBaseUrl() {
  return normalizeApiBaseUrl(
    getStoredApiBaseUrl() || import.meta.env.VITE_API_BASE_URL || ""
  );
}

export function getApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBaseUrl = getConfiguredApiBaseUrl();

  if (configuredBaseUrl) return `${configuredBaseUrl}${normalizedPath}`;
  if (!Capacitor.isNativePlatform()) return normalizedPath;

  throw new Error(
    "Android app не має доступу до локального /api у packaged build. " +
      "Запусти backend у мережі й задай API Base URL у налаштуваннях, наприклад http://192.168.1.20:5200."
  );
}

export function getAndroidApiHint() {
  if (!Capacitor.isNativePlatform()) return "";
  return "У Capacitor Android відносний /api не вказує на Vite server. Задай API Base URL у налаштуваннях GlowUp або VITE_API_BASE_URL перед build.";
}
