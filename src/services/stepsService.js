import { Capacitor, registerPlugin } from "@capacitor/core";

const GlowUpSteps = registerPlugin("GlowUpSteps");

export const hasNativeStepCounter = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export async function getAndroidTodaySteps() {
  if (!hasNativeStepCounter()) return null;
  return GlowUpSteps.getTodaySteps();
}
