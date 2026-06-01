import { Capacitor, registerPlugin } from "@capacitor/core";

const GlowUpTts = registerPlugin("GlowUpTts");

export const hasNativeTts = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export async function speakNativeText({ text, language = "uk-UA", rate = 1, pitch = 1 }) {
  return GlowUpTts.speak({
    text,
    language,
    rate: Number(rate) || 1,
    pitch: Number(pitch) || 1,
  });
}

export async function getNativeTtsAvailability() {
  if (!hasNativeTts()) {
    return { available: false, ready: false, native: false };
  }
  return GlowUpTts.isAvailable();
}

export async function stopNativeSpeech() {
  if (!hasNativeTts()) return;
  await GlowUpTts.stop();
}
