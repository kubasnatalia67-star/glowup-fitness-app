import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { getAndroidApiHint, getApiUrl } from "./apiConfigService.js";

const DEBUG_PREFIX = "[GlowUp Charlie]";

export async function askCharlie({ message, messages, profile, language, context }) {
  const apiUrl = getCharlieApiUrl();
  const payload = {
    message,
    messages,
    profile,
    language,
    context,
  };

  console.log(`${DEBUG_PREFIX} API request`, {
    apiUrl,
    messageLength: String(message || "").length,
    historyItems: Array.isArray(messages) ? messages.length : 0,
    language,
    hasContext: Boolean(context),
  });

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    return askCharlieWithNativeHttp(apiUrl, payload);
  }

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`${DEBUG_PREFIX} request failed`, error);
    throw new Error(
      `Не вдалося підключитися до /api/charlie: ${error.message}. ${getAndroidApiHint()}`
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
        `API /api/charlie повернув ${response.status} ${response.statusText || ""}`.trim()
    );
  }

  return result;
}

async function askCharlieWithNativeHttp(apiUrl, payload) {
  try {
    const response = await CapacitorHttp.post({
      url: apiUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: payload,
      responseType: "json",
    });

    console.log(`${DEBUG_PREFIX} native HTTP response`, {
      status: response.status,
      data: response.data,
    });

    const result =
      typeof response.data === "string" ? parseJsonResponse(response.data) : response.data || {};

    if (response.status < 200 || response.status >= 300) {
      throw new Error(result.error || `API /api/charlie повернув ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error(`${DEBUG_PREFIX} native request failed`, error);
    throw new Error(
      `Не вдалося підключитися до /api/charlie: ${error.message}. ${getAndroidApiHint()}`
    );
  }
}

function getCharlieApiUrl() {
  try {
    return getApiUrl("/api/charlie");
  } catch (error) {
    const message = error.message;
    console.error(`${DEBUG_PREFIX} API endpoint unavailable`, { reason: message });
    throw new Error(message);
  }
}

function parseJsonResponse(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "API returned an empty response." };
  }
}
