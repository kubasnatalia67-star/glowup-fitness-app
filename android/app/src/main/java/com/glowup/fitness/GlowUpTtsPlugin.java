package com.glowup.fitness;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.os.Bundle;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "GlowUpTts")
public class GlowUpTtsPlugin extends Plugin {
    private static final String MISSING_TTS_MESSAGE =
        "\u0423\u0432\u0456\u043c\u043a\u043d\u0438 \u0441\u0438\u043d\u0442\u0435\u0437 \u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u0432 \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f\u0445 Android.";

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
        String preset = call.getString("preset", "femaleCoach");
        String requestedVoiceName = call.getString("voiceName", "");
        Float rate = call.getFloat("rate", 1.1f);
        Float pitch = call.getFloat("pitch", 1.0f);
        Float volume = call.getFloat("volume", 1.0f);

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

            Voice selectedVoice = findVoiceByName(requestedVoiceName);
            if (selectedVoice == null) {
                selectedVoice = findBestVoice(selectedLocale, preset);
            }
            if (selectedVoice != null) {
                textToSpeech.setVoice(selectedVoice);
            }
            textToSpeech.setSpeechRate(rate == null ? 1.1f : rate);
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

            Bundle params = new Bundle();
            params.putFloat(
                TextToSpeech.Engine.KEY_PARAM_VOLUME,
                Math.max(0f, Math.min(1f, volume == null ? 1.0f : volume))
            );

            int result = textToSpeech.speak(
                normalizeSpeechText(text),
                TextToSpeech.QUEUE_FLUSH,
                params,
                "glowup-charlie-" + System.currentTimeMillis()
            );

            if (result == TextToSpeech.ERROR) {
                rejectMissingEngine(call);
                return;
            }

            JSObject response = new JSObject();
            response.put("spoken", true);
            response.put("language", selectedLocale.toLanguageTag());
            response.put("voice", selectedVoice == null ? "" : selectedVoice.getName());
            response.put("rate", rate == null ? 1.1f : rate);
            response.put("pitch", pitch == null ? 1.0f : pitch);
            response.put("volume", volume == null ? 1.0f : volume);
            response.put("preset", preset);
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

    @PluginMethod
    public void getVoices(PluginCall call) {
        Runnable listNow = () -> {
            JSArray result = new JSArray();
            Set<Voice> voices = textToSpeech == null ? null : textToSpeech.getVoices();

            if (voices != null) {
                voices.stream()
                    .filter(voice -> voice.getLocale() != null)
                    .sorted(
                        Comparator
                            .comparing((Voice voice) -> voice.getLocale().toLanguageTag())
                            .thenComparing(Voice::getName)
                    )
                    .forEach(voice -> {
                        JSObject item = new JSObject();
                        item.put("id", voice.getName());
                        item.put("name", voice.getName());
                        item.put("language", voice.getLocale().toLanguageTag());
                        item.put("quality", voice.getQuality());
                        item.put("latency", voice.getLatency());
                        item.put("networkRequired", voice.isNetworkConnectionRequired());
                        result.put(item);
                    });
            }

            JSObject response = new JSObject();
            response.put("native", true);
            response.put("ready", isReady);
            response.put("voices", result);
            response.put("reason", result.length() == 0 ? "voices unavailable" : "");
            call.resolve(response);
        };

        if (isReady) {
            getActivity().runOnUiThread(listNow);
        } else {
            initTextToSpeech(listNow);
        }
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

    private Voice findBestVoice(Locale selectedLocale, String preset) {
        Set<Voice> voices = textToSpeech.getVoices();
        if (voices == null || voices.isEmpty()) return null;

        String language = selectedLocale.getLanguage();
        String country = selectedLocale.getCountry();
        String normalizedPreset = preset == null ? "coach" : preset.toLowerCase(Locale.ROOT);

        return voices.stream()
            .filter(voice -> voice.getLocale() != null)
            .filter(voice -> language.equals(voice.getLocale().getLanguage()))
            .sorted(
                Comparator
                    .comparingInt((Voice voice) -> scoreVoice(voice, country, normalizedPreset))
                    .reversed()
            )
            .findFirst()
            .orElse(null);
    }

    private Voice findVoiceByName(String requestedVoiceName) {
        if (requestedVoiceName == null || requestedVoiceName.trim().isEmpty()) return null;
        Set<Voice> voices = textToSpeech.getVoices();
        if (voices == null) return null;

        return voices.stream()
            .filter(voice -> requestedVoiceName.equals(voice.getName()))
            .findFirst()
            .orElse(null);
    }

    private String normalizeSpeechText(String text) {
        return text
            .replaceAll("[\\r\\n]+", ". ")
            .replaceAll("\\.{2,}", ".")
            .replaceAll("\\s*[-•]\\s*", ", ")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private int scoreVoice(Voice voice, String country, String preset) {
        int score = 0;
        String name = voice.getName() == null ? "" : voice.getName().toLowerCase(Locale.ROOT);
        Locale locale = voice.getLocale();

        if (locale != null && !country.isEmpty() && country.equals(locale.getCountry())) score += 30;
        if (!voice.isNetworkConnectionRequired()) score += 20;
        score += voice.getQuality() * 6;
        score -= voice.getLatency() * 2;

        if ("maleCoach".equalsIgnoreCase(preset)) {
            if (name.contains("male") || name.contains("man") || name.contains("david") || name.contains("daniel")) score += 12;
            if (name.contains("female") || name.contains("woman")) score -= 10;
        } else if ("femaleCoach".equalsIgnoreCase(preset)) {
            if (name.contains("female") || name.contains("woman") || name.contains("google")) score += 12;
            if (name.contains("male") || name.contains("man")) score -= 10;
        } else if ("bright".equals(preset)) {
            if (name.contains("female") || name.contains("woman") || name.contains("google")) score += 10;
        } else if ("calm".equals(preset)) {
            if (name.contains("female") || name.contains("natural") || name.contains("google")) score += 8;
        }

        return score;
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
        } else {
            locales.add(Locale.forLanguageTag("en-US"));
            locales.add(Locale.ENGLISH);
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
