package com.glowup.fitness;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

import androidx.core.content.ContextCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class GlowUpStepUpdateReceiver extends BroadcastReceiver {
    static final String ACTION_REFRESH_STEPS = "com.glowup.fitness.REFRESH_STEPS";
    private static final long REFRESH_INTERVAL_MS = 15L * 60L * 1000L;
    private static final String STEPS_PREFS = "GlowUpSteps";
    private static final String WIDGET_PREFS = "GlowUpWidget";

    static void schedule(Context context) {
        AlarmManager alarmManager =
            (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            2201,
            new Intent(context, GlowUpStepUpdateReceiver.class)
                .setAction(ACTION_REFRESH_STEPS),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        alarmManager.setInexactRepeating(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 60_000L,
            REFRESH_INTERVAL_MS,
            pendingIntent
        );
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        schedule(context);

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACTIVITY_RECOGNITION
                ) != PackageManager.PERMISSION_GRANTED
        ) {
            return;
        }

        PendingResult pendingResult = goAsync();
        SensorManager sensorManager =
            (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        Sensor stepCounter =
            sensorManager == null ? null : sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);

        if (sensorManager == null || stepCounter == null) {
            pendingResult.finish();
            return;
        }

        Handler handler = new Handler(Looper.getMainLooper());
        final boolean[] finished = { false };
        final SensorEventListener[] listenerRef = new SensorEventListener[1];

        Runnable finish = () -> {
            if (finished[0]) return;
            finished[0] = true;
            if (listenerRef[0] != null) {
                sensorManager.unregisterListener(listenerRef[0]);
            }
            pendingResult.finish();
        };

        SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (finished[0] || event.values.length == 0) return;

                int totalSteps = Math.round(event.values[0]);
                GlowUpStepData.Snapshot snapshot =
                    GlowUpStepData.update(context, totalSteps);

                context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putInt("steps", snapshot.stepsToday)
                    .putString("stepsDate", snapshot.stepsDate)
                    .putInt("activeCalories", Math.round(snapshot.stepsToday * 0.04f))
                    .apply();

                GlowUpWidgetProvider.updateAllWidgets(context);
                finish.run();
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) {
            }
        };

        listenerRef[0] = listener;
        handler.postDelayed(finish, 8_000L);
        if (!sensorManager.registerListener(listener, stepCounter, SensorManager.SENSOR_DELAY_NORMAL)) {
            handler.removeCallbacks(finish);
            finish.run();
        }
    }

    private static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }
}
