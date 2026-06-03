import { readFileSync, writeFileSync, existsSync } from "node:fs";

const rawUrl = process.argv[2] || "";
const allowHttp = process.argv.includes("--allow-http");
const apiBaseUrl = normalizeApiBaseUrl(rawUrl);

if (!apiBaseUrl) {
  console.error("Usage: npm run api:set -- https://your-api.example.com");
  process.exit(1);
}

if (!/^https:\/\//i.test(apiBaseUrl) && !allowHttp) {
  console.error("Production API URL must use HTTPS. For local testing add -- --allow-http.");
  process.exit(1);
}

const envPath = ".env.local";
const key = "VITE_API_BASE_URL";
const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const lines = existing.split(/\r?\n/).filter((line, index, list) => {
  if (index === list.length - 1 && line === "") return false;
  return !line.trim().startsWith(`${key}=`);
});

lines.push(`${key}=${apiBaseUrl}`);
writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8");

console.log(`Saved ${key}=${apiBaseUrl}`);
console.log("Next: npm run build && npx cap sync android");

function normalizeApiBaseUrl(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}
