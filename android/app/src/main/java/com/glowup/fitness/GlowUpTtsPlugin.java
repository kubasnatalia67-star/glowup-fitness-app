package com.glowup.fitness;

import android.speech.tts.TextToSpeech;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

@CapacitorPlugin(name = "GlowUpTts")
public class GlowUpTtsPlugin extends Plugin {
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
                call.reject("Увімкни синтез мовлення в налаштуваннях Android.");
                return;
            }

            Locale locale = Locale.forLanguageTag(language);
            int languageStatus = textToSpeech.setLanguage(locale);
            if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
                call.reject("Увімкни синтез мовлення в налаштуваннях Android.");
                return;
            }

            textToSpeech.setSpeechRate(rate == null ? 1.0f : rate);
            textToSpeech.setPitch(pitch == null ? 1.0f : pitch);

            int result = textToSpeech.speak(
                text,
                TextToSpeech.QUEUE_FLUSH,
                null,
                "glowup-charlie-" + System.currentTimeMillis()
            );

            if (result == TextToSpeech.ERROR) {
                call.reject("Увімкни синтез мовлення в налаштуваннях Android.");
                return;
            }

            JSObject response = new JSObject();
            response.put("spoken", true);
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
        call.resolve(response);
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
