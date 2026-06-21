package com.glowup.fitness;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

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
    private static final String PERMISSION_MESSAGE = "Дозволь Physical activity / Activity recognition у налаштуваннях Android.";

    @PluginMethod
    public void getTodaySteps(PluginCall call) {
        if (!hasActivityPermission()) {
            requestPermissionForAlias("activity", call, "activityPermissionCallback");
            return;
        }

        readStepCounter(call, false);
    }

    @PluginMethod
    public void resetTodayBaseline(PluginCall call) {
        if (!hasActivityPermission()) {
            requestPermissionForAlias("activity", call, "resetPermissionCallback");
            return;
        }

        readStepCounter(call, true);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        SensorManager sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        Sensor stepCounter = sensorManager == null ? null : sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        GlowUpStepData.Snapshot snapshot = GlowUpStepData.read(getContext());
        boolean permissionGranted = hasActivityPermission();

        JSObject response = new JSObject();
        response.put("native", true);
        response.put("permissionGranted", permissionGranted);
        response.put("permissionState", Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ? "granted" : getPermissionState("activity").toString());
        response.put("hasSensor", stepCounter != null);
        response.put("available", permissionGranted && stepCounter != null);
        response.put("sensorName", stepCounter == null ? "" : stepCounter.getName());
        response.put("date", snapshot.stepsDate);
        response.put("baseline", snapshot.baselineSteps);
        response.put("lastTotal", snapshot.sensorTotalSteps);
        response.put("sensorTotalSteps", snapshot.sensorTotalSteps);
        response.put("baselineSteps", snapshot.baselineSteps);
        response.put("stepsToday", snapshot.stepsToday);
        response.put("stepsDate", snapshot.stepsDate);
        response.put("source", "android-step-counter");
        call.resolve(response);
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        Intent intent = new Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:" + getContext().getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);

        JSObject response = new JSObject();
        response.put("opened", true);
        call.resolve(response);
    }

    @PermissionCallback
    private void activityPermissionCallback(PluginCall call) {
        if (hasActivityPermission()) {
            readStepCounter(call, false);
            return;
        }

        call.reject(PERMISSION_MESSAGE);
    }

    @PermissionCallback
    private void resetPermissionCallback(PluginCall call) {
        if (hasActivityPermission()) {
            readStepCounter(call, true);
            return;
        }

        call.reject(PERMISSION_MESSAGE);
    }

    private boolean hasActivityPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            getPermissionState("activity") == PermissionState.GRANTED;
    }

    private void readStepCounter(PluginCall call, boolean resetBaseline) {
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
                GlowUpStepData.Snapshot snapshot = resetBaseline
                    ? GlowUpStepData.resetToday(getContext(), totalSteps)
                    : GlowUpStepData.update(getContext(), totalSteps);
                syncWidgetSteps(snapshot.stepsToday);

                JSObject response = new JSObject();
                response.put("available", true);
                response.put("steps", snapshot.stepsToday);
                response.put("totalSteps", totalSteps);
                response.put("baseline", snapshot.baselineSteps);
                response.put("date", snapshot.stepsDate);
                response.put("sensorTotalSteps", snapshot.sensorTotalSteps);
                response.put("baselineSteps", snapshot.baselineSteps);
                response.put("stepsToday", snapshot.stepsToday);
                response.put("stepsDate", snapshot.stepsDate);
                response.put("initialized", snapshot.reset);
                response.put("reset", resetBaseline);
                response.put("sensorName", stepCounter.getName());
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

    private void syncWidgetSteps(int todaySteps) {
        SharedPreferences widgetPrefs =
            getContext().getSharedPreferences("GlowUpWidget", Context.MODE_PRIVATE);
        widgetPrefs.edit()
            .putInt("steps", todaySteps)
            .putString("stepsDate", GlowUpStepData.todayKey())
            .putInt("activeCalories", Math.round(todaySteps * 0.04f))
            .apply();
        GlowUpWidgetProvider.updateAllWidgets(getContext());
    }

}
