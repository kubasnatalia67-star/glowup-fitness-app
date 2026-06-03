# GlowUp Fitness App Beta v1

GlowUp is a React + Vite fitness demo app with a local Node backend for:

- dashboard, progress, workouts, nutrition, water and sleep tracking
- Charlie AI Coach
- OpenAI food photo analysis through `/api/analyze-food`
- XP, achievements and challenges

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and add your key:

```bash
OPENAI_API_KEY=your_openai_key_here
```

Do not commit or share `.env.local`.

3. Start the app:

```bash
npm run dev
```

4. Open:

```text
http://127.0.0.1:5199/
```

## Test On Phone

Make sure your phone and laptop are on the same Wi-Fi.

```bash
npm run dev:phone
```

Then open this on your phone, replacing the IP with your laptop IPv4 address:

```text
http://192.168.0.101:5200/
```

If it does not open, allow Node.js through Windows Firewall for private networks.

## Health Check

```text
http://127.0.0.1:5199/api/health
```

Expected:

```json
{"ok":true,"openAiConfigured":true}
```

## Production AI Backend

For Android/PWA AI features, deploy `server.mjs` as a HTTPS backend. The app should call this backend instead of a local Wi-Fi IP.

Render setup:

1. Create a new Render Web Service from this repo, or use `render.yaml`.
2. Set environment variables on the server:

```text
NODE_ENV=production
API_ONLY=true
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4.1-mini
```

3. Render start command:

```bash
npm start
```

4. Check the deployed API:

```text
https://your-render-service.onrender.com/api/health
```

Expected:

```json
{"ok":true,"openAiConfigured":true}
```

5. Set the Android/PWA API base URL before building:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Or use the helper:

```bash
npm run api:set -- https://your-render-service.onrender.com
npm run api:check -- https://your-render-service.onrender.com
```

Then rebuild and sync Android:

```bash
npm run build
npx cap sync android
```

## Security Notes

- `.env.local` is local only and excluded from backups.
- `.env.example` contains only a placeholder.
- OpenAI calls are made through `server.mjs`, not from the frontend.

## Android / Capacitor

GlowUp has a Capacitor Android wrapper with:

- app id: `com.glowup.fitness`
- app name: `GlowUp`
- web directory: `dist`

Build and sync web assets into Android:

```bash
npm run build
npx cap sync android
```

Open the Android project in Android Studio:

```bash
npx cap open android
```

For Google Play, use Android Studio to create a signed Android App Bundle (`.aab`).
Do not put `OPENAI_API_KEY` in the Android app. Use a production HTTPS backend for AI requests.
