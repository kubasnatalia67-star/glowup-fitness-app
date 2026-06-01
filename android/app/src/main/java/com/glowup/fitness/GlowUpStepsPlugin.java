package com.glowup.fitness;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(
    name = "GlowUpSteps",
    permissions = {
        @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "activity")
    }
)
public class GlowUpStepsPlugin extends Plugin {
    private static final String PREFS_NAME = "GlowUpSteps";
    private static final String DATE_KEY = "date";
    private static final String BASELINE_KEY = "baseline";
    private static final String LAST_TOTAL_KEY = "lastTotal";

    @PluginMethod
    public void getTodaySteps(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && getPermissionState("activity") != PermissionState.GRANTED) {
            requestPermissionForAlias("activity", call, "activityPermissionCallback");
            return;
        }

        readStepCounter(call);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        SensorManager sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        Sensor stepCounter = sensorManager == null ? null : sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        boolean permissionGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            getPermissionState("activity") == PermissionState.GRANTED;

        JSObject response = new JSObject();
        response.put("native", true);
        response.put("permissionGranted", permissionGranted);
        response.put("permissionState", Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ? "granted" : getPermissionState("activity").toString());
        response.put("hasSensor", stepCounter != null);
        response.put("available", permissionGranted && stepCounter != null);
        response.put("sensorName", stepCounter == null ? "" : stepCounter.getName());
        response.put("source", "android-step-counter");
        call.resolve(response);
    }

    @PermissionCallback
    private void activityPermissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || getPermissionState("activity") == PermissionState.GRANTED) {
            readStepCounter(call);
            return;
        }

        call.reject("Дозволь Physical activity / Activity recognition у налаштуваннях Android.");
    }

    private void readStepCounter(PluginCall call) {
        SensorManager sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager == null) {
            call.reject("Android step sensor недоступний на цьому пристрої.");
            return;
        }

        Sensor stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (stepCounter == null) {
            call.reject("На цьому пристрої немає системного step counter сенсора.");
            return;
        }

        Handler handler = new Handler(Looper.getMainLooper());
        final SensorEventListener[] listenerRef = new SensorEventListener[1];
        final boolean[] resolved = { false };

        Runnable timeout = () -> {
            if (resolved[0]) return;
            resolved[0] = true;
            if (listenerRef[0] != null) {
                sensorManager.unregisterListener(listenerRef[0]);
            }
            call.reject("Не вдалося швидко прочитати кроки з Android сенсора.");
        };

        SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (resolved[0] || event.values.length == 0) return;
                resolved[0] = true;
                handler.removeCallbacks(timeout);
                sensorManager.unregisterListener(this);

                int totalSteps = Math.round(event.values[0]);
                StepSnapshot snapshot = getTodaySnapshot(totalSteps);

                JSObject response = new JSObject();
                response.put("available", true);
                response.put("steps", snapshot.todaySteps);
                response.put("totalSteps", totalSteps);
                response.put("baseline", snapshot.baseline);
                response.put("date", todayKey());
                response.put("initialized", snapshot.initialized);
                response.put("source", "android-step-counter");
                call.resolve(response);
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) {
            }
        };

        listenerRef[0] = listener;
        handler.postDelayed(timeout, 2500);

        boolean registered = sensorManager.registerListener(
            listener,
            stepCounter,
            SensorManager.SENSOR_DELAY_NORMAL,
            handler
        );

        if (!registered) {
            handler.removeCallbacks(timeout);
            call.reject("Android не дозволив підписатися на step counter сенсор.");
        }
    }

    private StepSnapshot getTodaySnapshot(int totalSteps) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String today = todayKey();
        String savedDate = prefs.getString(DATE_KEY, "");
        boolean initialized = false;
        int baseline;

        if (!today.equals(savedDate)) {
            baseline = totalSteps;
            initialized = true;
            prefs.edit()
                .putString(DATE_KEY, today)
                .putInt(BASELINE_KEY, baseline)
                .putInt(LAST_TOTAL_KEY, totalSteps)
                .apply();
        } else {
            baseline = prefs.getInt(BASELINE_KEY, totalSteps);
            prefs.edit().putInt(LAST_TOTAL_KEY, totalSteps).apply();
        }

        return new StepSnapshot(Math.max(0, totalSteps - baseline), baseline, initialized);
    }

    private static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static class StepSnapshot {
        final int todaySteps;
        final int baseline;
        final boolean initialized;

        StepSnapshot(int todaySteps, int baseline, boolean initialized) {
            this.todaySteps = todaySteps;
            this.baseline = baseline;
            this.initialized = initialized;
        }
    }
}
