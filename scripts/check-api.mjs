const rawUrl = process.argv[2] || process.env.VITE_API_BASE_URL || "";
const apiBaseUrl = normalizeApiBaseUrl(rawUrl);

if (!apiBaseUrl) {
  console.error("Usage: npm run api:check -- https://your-api.example.com");
  process.exit(1);
}

const healthUrl = `${apiBaseUrl}/api/health`;

try {
  const response = await fetch(healthUrl, {
    headers: { Accept: "application/json" },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok || !data.ok) {
    throw new Error(`Health check failed (${response.status}): ${text}`);
  }

  console.log(`API OK: ${healthUrl}`);
  console.log(`OpenAI configured: ${data.openAiConfigured ? "yes" : "no"}`);

  if (!data.openAiConfigured) {
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`API check failed: ${error.message}`);
  process.exit(1);
}

function normalizeApiBaseUrl(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}
