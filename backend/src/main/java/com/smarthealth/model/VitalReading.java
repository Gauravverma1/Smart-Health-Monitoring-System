package com.smarthealth.model;

public class VitalReading {
    private String patientId;
    private long timestamp;
    private double heartRate;
    private double spo2;
    private double temperature;
    private String risk;

    public VitalReading() {}

    public VitalReading(String patientId, long timestamp, double heartRate, double spo2, double temperature, String risk) {
        this.patientId = patientId;
        this.timestamp = timestamp;
        this.heartRate = heartRate;
        this.spo2 = spo2;
        this.temperature = temperature;
        this.risk = risk;
    }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    public double getHeartRate() { return heartRate; }
    public void setHeartRate(double heartRate) { this.heartRate = heartRate; }
    public double getSpo2() { return spo2; }
    public void setSpo2(double spo2) { this.spo2 = spo2; }
    public double getTemperature() { return temperature; }
    public void setTemperature(double temperature) { this.temperature = temperature; }
    public String getRisk() { return risk; }
    public void setRisk(String risk) { this.risk = risk; }
}
