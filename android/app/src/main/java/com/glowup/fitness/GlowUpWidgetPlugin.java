package com.glowup.fitness;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(name = "GlowUpWidget")
public class GlowUpWidgetPlugin extends Plugin {
    private static final String PREFS_NAME = "GlowUpWidget";
    private static final String WATER_KEY = "waterMl";
    private static final String WATER_DATE_KEY = "waterDate";
    private static final String WATER_GOAL_KEY = "waterGoalMl";
    private static final String WEIGHT_KEY = "weightKg";
    private static final String STEPS_KEY = "steps";
    private static final String ACTIVE_CALORIES_KEY = "activeCalories";
    private static final String CALORIES_CONSUMED_KEY = "caloriesConsumed";
    private static final String DAILY_CALORIES_GOAL_KEY = "dailyCaloriesGoal";
    private static final String REMAINING_CALORIES_KEY = "remainingCalories";

    @PluginMethod
    public void updateStats(PluginCall call) {
        Integer waterMl = call.getInt("waterMl", 0);
        Integer waterGoalMl = call.getInt("waterGoalMl", 2000);
        String waterDate = call.getString("waterDate", todayKey());
        String weightKg = call.getString("weightKg", "");
        Integer steps = call.getInt("steps", 0);
        Integer activeCalories = call.getInt("activeCalories", null);
        Integer caloriesConsumed = call.getInt("caloriesConsumed", 0);
        Integer dailyCaloriesGoal = call.getInt("dailyCaloriesGoal", 0);
        Integer remainingCalories = call.getInt("remainingCalories", 0);

        int safeSteps = steps == null ? 0 : steps;
        int safeActiveCalories =
            activeCalories == null ? Math.round(safeSteps * 0.04f) : activeCalories;
        String today = todayKey();
        boolean isToday = today.equals(waterDate);

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putInt(WATER_KEY, isToday && waterMl != null ? waterMl : 0)
            .putString(WATER_DATE_KEY, today)
            .putInt(WATER_GOAL_KEY, waterGoalMl == null ? 2000 : waterGoalMl)
            .putString(WEIGHT_KEY, weightKg == null ? "" : weightKg)
            .putInt(STEPS_KEY, safeSteps)
            .putInt(ACTIVE_CALORIES_KEY, safeActiveCalories)
            .putInt(CALORIES_CONSUMED_KEY, caloriesConsumed == null ? 0 : caloriesConsumed)
            .putInt(DAILY_CALORIES_GOAL_KEY, dailyCaloriesGoal == null ? 0 : dailyCaloriesGoal)
            .putInt(REMAINING_CALORIES_KEY, remainingCalories == null ? 0 : remainingCalories)
            .apply();

        GlowUpWidgetProvider.updateAllWidgets(getContext());

        JSObject response = new JSObject();
        response.put("updated", true);
        response.put("waterDate", today);
        call.resolve(response);
    }

    @PluginMethod
    public void getStats(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        GlowUpWidgetProvider.resetWaterIfNewDay(prefs);

        call.resolve(buildStatsResponse(prefs));
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        GlowUpWidgetProvider.resetWaterIfNewDay(prefs);

        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        ComponentName provider = new ComponentName(getContext(), GlowUpWidgetProvider.class);
        int[] widgetIds = manager.getAppWidgetIds(provider);

        JSObject response = buildStatsResponse(prefs);
        response.put("native", true);
        response.put("widgetCount", widgetIds == null ? 0 : widgetIds.length);
        response.put(
            "canRequestPin",
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.isRequestPinAppWidgetSupported()
        );
        call.resolve(response);
    }

    @PluginMethod
    public void requestPinWidget(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("Android launcher does not support widget pinning on this version.");
            return;
        }

        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        if (!manager.isRequestPinAppWidgetSupported()) {
            call.reject("Android launcher does not support widget pinning.");
            return;
        }

        ComponentName provider = new ComponentName(getContext(), GlowUpWidgetProvider.class);
        boolean requested = manager.requestPinAppWidget(provider, null, null);

        JSObject response = new JSObject();
        response.put("requested", requested);
        call.resolve(response);
    }

    private JSObject buildStatsResponse(SharedPreferences prefs) {
        int steps = prefs.getInt(STEPS_KEY, 0);
        int activeCalories = prefs.getInt(ACTIVE_CALORIES_KEY, Math.round(steps * 0.04f));

        JSObject response = new JSObject();
        response.put("waterMl", prefs.getInt(WATER_KEY, 0));
        response.put("waterDate", prefs.getString(WATER_DATE_KEY, todayKey()));
        response.put("waterGoalMl", prefs.getInt(WATER_GOAL_KEY, 2000));
        response.put("weightKg", prefs.getString(WEIGHT_KEY, ""));
        response.put("steps", steps);
        response.put("activeCalories", activeCalories);
        response.put("caloriesConsumed", prefs.getInt(CALORIES_CONSUMED_KEY, 0));
        response.put("dailyCaloriesGoal", prefs.getInt(DAILY_CALORIES_GOAL_KEY, 0));
        response.put("remainingCalories", prefs.getInt(REMAINING_CALORIES_KEY, 0));
        return response;
    }

    private static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }
}
