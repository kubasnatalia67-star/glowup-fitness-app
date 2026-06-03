package com.glowup.fitness;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name = "GlowUpTts")
public class GlowUpTtsPlugin extends Plugin {
    private static final String MISSING_TTS_MESSAGE = "Увімкни синтез мовлення в налаштуваннях Android.";

    private TextToSpeech textToSpeech;
    private boolean isReady = false;
    private boolean initFailed = false;

    @Override
    public void load() {
        initTextToSpeech(null);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String language = call.getString("language", "uk-UA");
        Float rate = call.getFloat("rate", 1.0f);
        Float pitch = call.getFloat("pitch", 1.0f);

        if (text == null || text.trim().isEmpty()) {
            call.reject("Text is empty.");
            return;
        }

        Runnable speakNow = () -> {
            if (textToSpeech == null || initFailed) {
                rejectMissingEngine(call);
                return;
            }

            Locale selectedLocale = findSupportedLocale(language);
            if (selectedLocale == null) {
                rejectMissingEngine(call);
                return;
            }

            textToSpeech.setSpeechRate(rate == null ? 1.0f : rate);
            textToSpeech.setPitch(pitch == null ? 1.0f : pitch);
            textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                }

                @Override
                public void onDone(String utteranceId) {
                }

                @Override
                public void onError(String utteranceId) {
                    getBridge().executeOnMainThread(() -> rejectMissingEngine(call));
                }
            });

            int result = textToSpeech.speak(
                text,
                TextToSpeech.QUEUE_FLUSH,
                null,
                "glowup-charlie-" + System.currentTimeMillis()
            );

            if (result == TextToSpeech.ERROR) {
                rejectMissingEngine(call);
                return;
            }

            JSObject response = new JSObject();
            response.put("spoken", true);
            response.put("language", selectedLocale.toLanguageTag());
            response.put("rate", rate == null ? 1.0f : rate);
            response.put("pitch", pitch == null ? 1.0f : pitch);
            call.resolve(response);
        };

        if (isReady) {
            getActivity().runOnUiThread(speakNow);
        } else {
            initTextToSpeech(speakNow);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
        call.resolve();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject response = new JSObject();
        response.put("available", textToSpeech != null && !initFailed);
        response.put("ready", isReady);
        response.put("native", true);
        response.put("message", initFailed ? MISSING_TTS_MESSAGE : "");
        call.resolve(response);
    }

    private Locale findSupportedLocale(String language) {
        for (Locale locale : getLocaleCandidates(language)) {
            int languageStatus = textToSpeech.setLanguage(locale);
            if (languageStatus != TextToSpeech.LANG_MISSING_DATA && languageStatus != TextToSpeech.LANG_NOT_SUPPORTED) {
                return locale;
            }
        }

        return null;
    }

    private List<Locale> getLocaleCandidates(String language) {
        List<Locale> locales = new ArrayList<>();
        String languageTag = language == null ? "uk-UA" : language;
        Locale requested = Locale.forLanguageTag(languageTag);
        String languageCode = requested.getLanguage();

        locales.add(requested);
        if (!languageCode.isEmpty()) {
            locales.add(Locale.forLanguageTag(languageCode));
        }
        if ("uk".equals(languageCode)) {
            locales.add(Locale.forLanguageTag("uk-UA"));
        }
        if ("en".equals(languageCode)) {
            locales.add(Locale.forLanguageTag("en-US"));
        }

        return locales;
    }

    private void rejectMissingEngine(PluginCall call) {
        call.reject(MISSING_TTS_MESSAGE);
    }

    private void initTextToSpeech(Runnable onReady) {
        if (textToSpeech != null) {
            if (isReady && onReady != null) onReady.run();
            return;
        }

        getActivity().runOnUiThread(() -> {
            textToSpeech = new TextToSpeech(getContext(), status -> {
                if (status == TextToSpeech.SUCCESS) {
                    isReady = true;
                    initFailed = false;
                    if (onReady != null) onReady.run();
                } else {
                    initFailed = true;
                }
            });
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        super.handleOnDestroy();
    }
}
