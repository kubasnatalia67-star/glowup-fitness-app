package com.glowup.fitness;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(GlowUpTtsPlugin.class);
        registerPlugin(GlowUpWidgetPlugin.class);
        registerPlugin(GlowUpStepsPlugin.class);
        super.onCreate(savedInstanceState);
        GlowUpStepUpdateReceiver.schedule(this);
    }
}
