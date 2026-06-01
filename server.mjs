import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import { Readable } from "node:stream";
import { createServer as createViteServer } from "vite";

const cliOptions = readCliOptions();
const host = cliOptions.host || process.env.HOST || "127.0.0.1";
const port = Number(cliOptions.port || process.env.PORT || 5199);

loadLocalEnv();

const vite = await createViteServer({
  appType: "spa",
  server: {
    host,
    middlewareMode: true,
  },
});

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  if (url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      openAiConfigured: Boolean(getOpenAiKey()),
    });
    return;
  }

  if (url.pathname === "/api/analyze-food" && request.method === "POST") {
    try {
      const body = await readAnalyzeFoodBody(request, url);
      const result = await analyzeFoodWithOpenAI(body);
      sendJson(response, 200, result);
    } catch (error) {
      console.error("Food analysis failed:", error.message);
      sendJson(response, error.statusCode || 500, {
        error: error.publicMessage || "Food analysis failed.",
      });
    }
    return;
  }

  if (url.pathname === "/api/analyze-body" && request.method === "POST") {
    try {
      const body = await readAnalyzeBodyBody(request, url);
      const result = await analyzeBodyWithOpenAI(body);
      sendJson(response, 200, result);
    } catch (error) {
      console.error("Body analysis failed:", error.message);
      sendJson(response, error.statusCode || 500, {
        error: error.publicMessage || "Body analysis failed.",
      });
    }
    return;
  }

  if (url.pathname === "/api/charlie" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const result = await askCharlieWithOpenAI(body);
      sendJson(response, 200, result);
    } catch (error) {
      console.error("Charlie failed:", error.message);
      sendJson(response, error.statusCode || 500, {
        error: error.publicMessage || "Charlie is not available right now.",
      });
    }
    return;
  }

  vite.middlewares(request, response, () => {
    response.statusCode = 404;
    response.end("Not found");
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Try: npm run dev:phone`);
    process.exit(1);
  }

  throw error;
});

server.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "your-phone-ip" : host;
  console.log(`GlowUp dev server: http://${displayHost}:${port}/`);
  if (host === "0.0.0.0") {
    console.log("Phone mode: open this app from your phone using your laptop Wi-Fi IPv4 address.");
  }
  console.log(`OpenAI key configured: ${getOpenAiKey() ? "yes" : "no"}`);
});

function readCliOptions() {
  const options = {};
  const args = process.argv.slice(2);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--host") {
      const next = args[index + 1];
      options.host = next && !next.startsWith("--") ? next : "0.0.0.0";
      if (next && !next.startsWith("--")) index += 1;
    }

    if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length) || "0.0.0.0";
    }

    if (arg === "--port") {
      const next = args[index + 1];
      if (next && !next.startsWith("--")) {
        options.port = next;
        index += 1;
      }
    }

    if (arg.startsWith("--port=")) {
      options.port = arg.slice("--port=".length);
    }
  }

  return options;
}

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    if (!existsSync(filename)) continue;

    const lines = readFileSync(filename, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function getOpenAiKey() {
  const key = process.env.OPENAI_API_KEY || "";
  return key.trim();
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (body.length > 12 * 1024 * 1024) {
      const error = new Error("Payload too large.");
      error.statusCode = 413;
      error.publicMessage = "Photo is too large.";
      throw error;
    }
  }

  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const error = new Error("Invalid JSON.");
    error.statusCode = 400;
    error.publicMessage = "Invalid request body.";
    throw error;
  }
}

async function readAnalyzeFoodBody(request, url) {
  const contentType = request.headers["content-type"] || "";

  if (!contentType.includes("multipart/form-data")) {
    return readJsonBody(request);
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const webRequest = new Request(url.href, {
    method: request.method,
    headers,
    body: Readable.toWeb(request),
    duplex: "half",
  });
  const formData = await webRequest.formData();
  const imageFile = formData.get("image");
  const foodName = String(formData.get("foodName") || "");

  if (!imageFile || typeof imageFile.arrayBuffer !== "function") {
    const error = new Error("Multipart image file is missing.");
    error.statusCode = 400;
    error.publicMessage = "Photo is missing from upload.";
    throw error;
  }

  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = imageFile.type || "image/jpeg";
  const image = `data:${mimeType};base64,${buffer.toString("base64")}`;

  console.log("Food analysis upload:", {
    contentType,
    foodName,
    imageName: imageFile.name,
    imageType: mimeType,
    imageBytes: buffer.length,
    imageDataUrlChars: image.length,
  });

  return { image, foodName };
}

async function readAnalyzeBodyBody(request, url) {
  const contentType = request.headers["content-type"] || "";

  if (!contentType.includes("multipart/form-data")) {
    return readJsonBody(request);
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const webRequest = new Request(url.href, {
    method: request.method,
    headers,
    body: Readable.toWeb(request),
    duplex: "half",
  });
  const formData = await webRequest.formData();
  const imageFile = formData.get("image");
  const rawProfile = String(formData.get("profile") || "{}");

  if (!imageFile || typeof imageFile.arrayBuffer !== "function") {
    const error = new Error("Multipart body image file is missing.");
    error.statusCode = 400;
    error.publicMessage = "Body photo is missing from upload.";
    throw error;
  }

  let profile = {};
  try {
    profile = JSON.parse(rawProfile);
  } catch {
    profile = {};
  }

  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = imageFile.type || "image/jpeg";
  const image = `data:${mimeType};base64,${buffer.toString("base64")}`;

  console.log("Body analysis upload:", {
    contentType,
    imageName: imageFile.name,
    imageType: mimeType,
    imageBytes: buffer.length,
    imageDataUrlChars: image.length,
    profile,
  });

  return { image, profile };
}

async function analyzeFoodWithOpenAI({ image, foodName = "" } = {}) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is missing.");
    error.statusCode = 500;
    error.publicMessage = "OPENAI_API_KEY is not configured.";
    throw error;
  }

  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    const error = new Error("Food photo is missing.");
    error.statusCode = 400;
    error.publicMessage = "Food photo is missing.";
    throw error;
  }

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this food photo. Return only JSON with this shape: " +
                '{"name":"dish name","calories":number,"protein":number,"fat":number,"carbs":number,"advice":"short practical advice"}. ' +
                `If the user typed a hint, use it carefully: ${foodName || "no hint"}.`,
            },
            {
              type: "input_image",
              image_url: image,
              detail: "low",
            },
          ],
        },
      ],
    }),
  });

  if (!apiResponse.ok) {
    const errorBody = await apiResponse.text();
    const error = new Error(errorBody || "OpenAI API request failed.");
    error.statusCode = apiResponse.status;
    error.publicMessage = `OpenAI API request failed (${apiResponse.status}): ${errorBody.slice(0, 500)}`;
    throw error;
  }

  const data = await apiResponse.json();
  const text = data.output_text || extractOutputText(data);
  const parsed = parseFoodJson(text);

  return {
    name: String(parsed.name || "Food"),
    calories: Number(parsed.calories) || 0,
    protein: Number(parsed.protein) || 0,
    fat: Number(parsed.fat) || 0,
    carbs: Number(parsed.carbs) || 0,
    advice: String(parsed.advice || "This is an approximate nutrition estimate."),
    source: "openai",
  };
}

async function analyzeBodyWithOpenAI({ image, profile = {} } = {}) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is missing.");
    error.statusCode = 500;
    error.publicMessage = "OPENAI_API_KEY is not configured.";
    throw error;
  }

  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    const error = new Error("Body photo is missing.");
    error.statusCode = 400;
    error.publicMessage = "Body photo is missing.";
    throw error;
  }

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this full-body fitness progress photo for posture and training focus. " +
                "Do not diagnose disease, do not identify the person, and do not mention sensitive traits. " +
                "Return only JSON with this exact shape: " +
                '{"bodyScore":number,"visual":"short observation","posture":"short posture note","problems":["item"],"recommendations":["item"],"source":"openai"}. ' +
                "bodyScore should be 0-100 and approximate. Give practical workout/posture suggestions. " +
                `User profile JSON: ${JSON.stringify(profile || {})}`,
            },
            {
              type: "input_image",
              image_url: image,
              detail: "low",
            },
          ],
        },
      ],
    }),
  });

  if (!apiResponse.ok) {
    const errorBody = await apiResponse.text();
    const error = new Error(errorBody || "OpenAI API request failed.");
    error.statusCode = apiResponse.status;
    error.publicMessage = `OpenAI API request failed (${apiResponse.status}): ${errorBody.slice(0, 500)}`;
    throw error;
  }

  const data = await apiResponse.json();
  const text = data.output_text || extractOutputText(data);
  const parsed = parseFoodJson(text);

  return {
    bodyScore: clampNumber(parsed.bodyScore, 0, 100, 70),
    visual: String(parsed.visual || "Body photo analyzed for general fitness progress."),
    posture: String(parsed.posture || "No medical diagnosis; use this as a training-focus note."),
    problems: normalizeStringArray(parsed.problems, [
      "Потрібно більше якісних даних або чіткіше фото для точнішої оцінки.",
    ]),
    recommendations: normalizeStringArray(parsed.recommendations, [
      "Повтори фото через 2-4 тижні в тому самому освітленні.",
    ]),
    source: "openai",
  };
}

async function askCharlieWithOpenAI({
  message = "",
  messages = [],
  profile = {},
  language = "uk",
} = {}) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is missing.");
    error.statusCode = 500;
    error.publicMessage = "OPENAI_API_KEY is not configured.";
    throw error;
  }

  const cleanMessage = String(message || "").trim();
  const languageName = getLanguageName(language);
  if (!cleanMessage) {
    return {
      answer: "Я Чарлі. Напиши мені питання, і я відповім коротко та по справі.",
      source: "openai",
    };
  }

  const history = Array.isArray(messages)
    ? messages
        .slice(-10)
        .map((item) => `${item.role === "assistant" ? "Charlie" : "User"}: ${item.text || ""}`)
        .join("\n")
    : "";

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions:
        "You are Charlie, a warm AI coach inside the GlowUp fitness app. " +
        `Answer only in ${languageName}. Be helpful for fitness, nutrition, habits, motivation, mental health, productivity, and earning goals. ` +
        "Keep answers practical, friendly, and concise. Do not say you work locally. " +
        "Do not give medical diagnosis; for risky health symptoms, advise consulting a professional.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `User profile JSON: ${JSON.stringify(profile || {})}\n\n` +
                `Recent chat:\n${history || "No previous messages."}\n\n` +
                `Current question: ${cleanMessage}`,
            },
          ],
        },
      ],
    }),
  });

  if (!apiResponse.ok) {
    const errorBody = await apiResponse.text();
    const error = new Error(errorBody || "OpenAI API request failed.");
    error.statusCode = apiResponse.status;
    error.publicMessage = "OpenAI API request failed.";
    throw error;
  }

  const data = await apiResponse.json();
  const answer = (data.output_text || extractOutputText(data)).trim();

  return {
    answer: answer || "Я Чарлі. Можеш уточнити питання, і я допоможу краще.",
    source: "openai",
  };
}

function getLanguageName(code) {
  const names = {
    uk: "Ukrainian",
    en: "English",
    pl: "Polish",
    de: "German",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    sv: "Swedish",
    no: "Norwegian",
    da: "Danish",
    fi: "Finnish",
    et: "Estonian",
    lv: "Latvian",
    lt: "Lithuanian",
    cs: "Czech",
    sk: "Slovak",
    sl: "Slovenian",
    hr: "Croatian",
    sr: "Serbian",
    bg: "Bulgarian",
    ro: "Romanian",
    hu: "Hungarian",
    el: "Greek",
    tr: "Turkish",
    ar: "Arabic",
    he: "Hebrew",
    fa: "Persian",
    hi: "Hindi",
    bn: "Bengali",
    ur: "Urdu",
    id: "Indonesian",
    ms: "Malay",
    vi: "Vietnamese",
    th: "Thai",
    ko: "Korean",
    ja: "Japanese",
    zh: "Chinese",
  };

  return names[String(code || "").toLowerCase()] || "the selected app language";
}

function extractOutputText(data) {
  const chunks = [];

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function parseFoodJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("OpenAI returned non-JSON food analysis.");
  }
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalizeStringArray(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 6);
  return items.length > 0 ? items : fallback;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}
