import { getAndroidApiHint, getApiUrl } from "./apiConfigService.js";

const DEBUG_PREFIX = "[GlowUp Charlie]";

export async function askCharlie({ message, messages, profile, language }) {
  const apiUrl = getCharlieApiUrl();

  console.log(`${DEBUG_PREFIX} API request`, {
    apiUrl,
    messageLength: String(message || "").length,
    historyItems: Array.isArray(messages) ? messages.length : 0,
    language,
  });

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        messages,
        profile,
        language,
      }),
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
