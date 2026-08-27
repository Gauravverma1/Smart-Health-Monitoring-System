package com.smarthealth.service;

import com.smarthealth.model.VitalReading;

public class AlertService {
    public String evaluateRisk(VitalReading r) {
        boolean high = r.getSpo2() < 92 || r.getTemperature() >= 38.5;
        boolean medium = r.getHeartRate() > 120 || r.getTemperature() >= 37.8;
        if (high) return "HIGH";
        if (medium) return "MEDIUM";
        return "LOW";
    }
}
