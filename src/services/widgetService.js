import { Capacitor, registerPlugin } from "@capacitor/core";

const GlowUpWidget = registerPlugin("GlowUpWidget");

export const hasNativeWidget = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export async function updateGlowUpWidget({
  waterMl = 0,
  waterGoalMl = 2000,
  waterDate = "",
  weightKg = "",
  steps = 0,
  activeCalories,
  caloriesConsumed = 0,
  dailyCaloriesGoal = 0,
  remainingCalories = 0,
}) {
  if (!hasNativeWidget()) return;
  const safeSteps = Number(steps) || 0;
  const safeActiveCalories =
    activeCalories === undefined ? Math.round(safeSteps * 0.04) : Number(activeCalories) || 0;

  await GlowUpWidget.updateStats({
    waterMl: Number(waterMl) || 0,
    waterGoalMl: Number(waterGoalMl) || 2000,
    waterDate: String(waterDate || ""),
    weightKg: String(weightKg || ""),
    steps: safeSteps,
    activeCalories: safeActiveCalories,
    caloriesConsumed: Number(caloriesConsumed) || 0,
    dailyCaloriesGoal: Number(dailyCaloriesGoal) || 0,
    remainingCalories: Number(remainingCalories) || 0,
  });
}

export async function getGlowUpWidgetStats() {
  if (!hasNativeWidget()) return null;
  return GlowUpWidget.getStats();
}
