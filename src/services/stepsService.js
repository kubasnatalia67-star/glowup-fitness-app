import { Capacitor, registerPlugin } from "@capacitor/core";

const GlowUpSteps = registerPlugin("GlowUpSteps");

export const hasNativeStepCounter = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export async function getAndroidTodaySteps() {
  if (!hasNativeStepCounter()) return null;
  return GlowUpSteps.getTodaySteps();
}

export async function resetAndroidStepsBaseline() {
  if (!hasNativeStepCounter()) return null;
  return GlowUpSteps.resetTodayBaseline();
}

export async function getAndroidStepsStatus() {
  if (!hasNativeStepCounter()) {
    return {
      native: false,
      available: false,
      permissionGranted: false,
      hasSensor: false,
      source: "manual",
    };
  }

  return GlowUpSteps.getStatus();
}

export async function openAndroidStepsPermissionSettings() {
  if (!hasNativeStepCounter()) return null;
  return GlowUpSteps.openPermissionSettings();
}
