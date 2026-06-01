package com.glowup.fitness;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class GlowUpWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_ADD_WATER = "com.glowup.fitness.ADD_WATER";
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

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_ADD_WATER.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            resetWaterIfNewDay(prefs);

            int waterMl = prefs.getInt(WATER_KEY, 0) + 250;
            prefs.edit()
                .putInt(WATER_KEY, waterMl)
                .putString(WATER_DATE_KEY, todayKey())
                .apply();

            updateAllWidgets(context);
        }
    }

    static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widget = new ComponentName(context, GlowUpWidgetProvider.class);
        int[] widgetIds = manager.getAppWidgetIds(widget);
        for (int appWidgetId : widgetIds) {
            updateAppWidget(context, manager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        resetWaterIfNewDay(prefs);

        int waterMl = prefs.getInt(WATER_KEY, 0);
        int waterGoalMl = Math.max(1, prefs.getInt(WATER_GOAL_KEY, 2000));
        String weight = prefs.getString(WEIGHT_KEY, "-");
        String weightText = weight == null || weight.trim().isEmpty() ? "-" : weight.trim();
        int steps = prefs.getInt(STEPS_KEY, 0);
        int activeCalories = prefs.getInt(ACTIVE_CALORIES_KEY, Math.round(steps * 0.04f));
        int caloriesConsumed = prefs.getInt(CALORIES_CONSUMED_KEY, 0);
        int dailyCaloriesGoal = prefs.getInt(DAILY_CALORIES_GOAL_KEY, 0);
        int remainingCalories = prefs.getInt(
            REMAINING_CALORIES_KEY,
            dailyCaloriesGoal - caloriesConsumed + activeCalories
        );
        int waterProgress = Math.min(100, Math.round((waterMl * 100f) / waterGoalMl));

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.glowup_widget);
        views.setTextViewText(R.id.widget_water, waterMl + " мл");
        views.setTextViewText(R.id.widget_weight, weightText + " кг");
        views.setTextViewText(R.id.widget_steps, String.valueOf(steps));
        views.setTextViewText(R.id.widget_active_calories, activeCalories + " ккал");
        views.setTextViewText(
            R.id.widget_calories_day,
            "Зʼїдено " + caloriesConsumed + " | рух +" + activeCalories + " | лишилось " + remainingCalories
        );
        views.setTextViewText(
            R.id.widget_water_status,
            waterMl >= waterGoalMl ? "Ціль виконана ✨" : waterMl + " / " + waterGoalMl + " мл"
        );
        views.setProgressBar(R.id.widget_water_progress, 100, waterProgress, false);

        Intent addWaterIntent = new Intent(context, GlowUpWidgetProvider.class);
        addWaterIntent.setAction(ACTION_ADD_WATER);
        PendingIntent addWaterPendingIntent = PendingIntent.getBroadcast(
            context,
            1001,
            addWaterIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_add_water, addWaterPendingIntent);

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            PendingIntent launchPendingIntent = PendingIntent.getActivity(
                context,
                1002,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_root, launchPendingIntent);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    static void resetWaterIfNewDay(SharedPreferences prefs) {
        String today = todayKey();
        String savedDate = prefs.getString(WATER_DATE_KEY, "");
        if (!today.equals(savedDate)) {
            prefs.edit()
                .putInt(WATER_KEY, 0)
                .putString(WATER_DATE_KEY, today)
                .apply();
        }
    }
}
