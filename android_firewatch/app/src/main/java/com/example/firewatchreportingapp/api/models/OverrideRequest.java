package com.example.firewatchreportingapp.api.models;

public class OverrideRequest {
    private boolean consent;

    public OverrideRequest(boolean consent) {
        this.consent = consent;
    }

    public boolean isConsent() {
        return consent;
    }

    public void setConsent(boolean consent) {
        this.consent = consent;
    }
}
