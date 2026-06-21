package com.glowup.fitness;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

final class GlowUpStepData {
    static final String PREFS_NAME = "GlowUpSteps";
    static final String DATE_KEY = "date";
    static final String BASELINE_KEY = "baseline";
    static final String LAST_TOTAL_KEY = "lastTotal";
    static final String ALGORITHM_VERSION_KEY = "algorithmVersion";
    static final int ALGORITHM_VERSION = 3;
    static final int MAX_REASONABLE_DAILY_STEPS = 100_000;

    private GlowUpStepData() {
    }

    static Snapshot update(Context context, int sensorTotalSteps) {
        SharedPreferences prefs =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String today = todayKey();
        String savedDate = prefs.getString(DATE_KEY, "");
        boolean hasBaseline = prefs.contains(BASELINE_KEY);
        boolean hasLastTotal = prefs.contains(LAST_TOTAL_KEY);
        int baselineSteps = prefs.getInt(BASELINE_KEY, sensorTotalSteps);
        int lastTotalSteps = prefs.getInt(LAST_TOTAL_KEY, 0);
        int savedVersion = prefs.getInt(ALGORITHM_VERSION_KEY, 0);
        boolean reset = false;

        if (
            savedVersion != ALGORITHM_VERSION
                || !today.equals(savedDate)
                || (!hasBaseline && sensorTotalSteps > 0)
                || (!hasLastTotal && sensorTotalSteps > 0)
                || (baselineSteps <= 0 && lastTotalSteps <= 0 && sensorTotalSteps > 0)
        ) {
            baselineSteps = sensorTotalSteps;
            reset = true;
        }

        int stepsToday = sensorTotalSteps - baselineSteps;
        if (stepsToday < 0 || stepsToday > MAX_REASONABLE_DAILY_STEPS) {
            baselineSteps = sensorTotalSteps;
            stepsToday = 0;
            reset = true;
        }

        prefs.edit()
            .putString(DATE_KEY, today)
            .putInt(BASELINE_KEY, baselineSteps)
            .putInt(LAST_TOTAL_KEY, sensorTotalSteps)
            .putInt(ALGORITHM_VERSION_KEY, ALGORITHM_VERSION)
            .apply();

        return new Snapshot(
            sensorTotalSteps,
            baselineSteps,
            stepsToday,
            today,
            reset
        );
    }

    static Snapshot resetToday(Context context, int sensorTotalSteps) {
        SharedPreferences prefs =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String today = todayKey();
        prefs.edit()
            .putString(DATE_KEY, today)
            .putInt(BASELINE_KEY, sensorTotalSteps)
            .putInt(LAST_TOTAL_KEY, sensorTotalSteps)
            .putInt(ALGORITHM_VERSION_KEY, ALGORITHM_VERSION)
            .apply();
        return new Snapshot(sensorTotalSteps, sensorTotalSteps, 0, today, true);
    }

    static Snapshot read(Context context) {
        SharedPreferences prefs =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String today = todayKey();
        String savedDate = prefs.getString(DATE_KEY, "");
        int sensorTotalSteps = prefs.getInt(LAST_TOTAL_KEY, 0);
        int baselineSteps = prefs.getInt(BASELINE_KEY, sensorTotalSteps);
        int savedVersion = prefs.getInt(ALGORITHM_VERSION_KEY, 0);

        if (savedVersion != ALGORITHM_VERSION || !today.equals(savedDate)) {
            if (sensorTotalSteps <= 0) {
                return new Snapshot(0, 0, 0, today, true);
            }
            return resetToday(context, sensorTotalSteps);
        }

        int stepsToday = sensorTotalSteps - baselineSteps;
        if (stepsToday < 0 || stepsToday > MAX_REASONABLE_DAILY_STEPS) {
            return resetToday(context, sensorTotalSteps);
        }

        return new Snapshot(
            sensorTotalSteps,
            baselineSteps,
            stepsToday,
            savedDate,
            false
        );
    }

    static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    static final class Snapshot {
        final int sensorTotalSteps;
        final int baselineSteps;
        final int stepsToday;
        final String stepsDate;
        final boolean reset;

        Snapshot(
            int sensorTotalSteps,
            int baselineSteps,
            int stepsToday,
            String stepsDate,
            boolean reset
        ) {
            this.sensorTotalSteps = sensorTotalSteps;
            this.baselineSteps = baselineSteps;
            this.stepsToday = stepsToday;
            this.stepsDate = stepsDate;
            this.reset = reset;
        }
    }
}
