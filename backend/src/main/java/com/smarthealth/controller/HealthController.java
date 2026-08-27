package com.smarthealth.controller;

import com.smarthealth.model.VitalReading;
import com.smarthealth.service.AlertService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class HealthController {
    private final Map<String, List<VitalReading>> store = new ConcurrentHashMap<>();
    private final AlertService alertService = new AlertService();
    private final RestTemplate http = new RestTemplate();

    @Value("${ai.url:http://localhost:8000}")
    private String aiUrl;

    @PostMapping("/vitals")
    public ResponseEntity<VitalReading> ingest(@RequestBody VitalReading r) {
        r.setTimestamp(r.getTimestamp() == 0 ? System.currentTimeMillis() : r.getTimestamp());
        String risk = callAiRisk(r);
        r.setRisk(risk);
        store.computeIfAbsent(r.getPatientId(), k -> new ArrayList<>()).add(r);
        return new ResponseEntity<>(r, HttpStatus.OK);
    }

    @GetMapping("/vitals/{patientId}/latest")
    public ResponseEntity<VitalReading> latest(@PathVariable String patientId) {
        List<VitalReading> list = store.getOrDefault(patientId, Collections.emptyList());
        if (list.isEmpty()) return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        return new ResponseEntity<>(list.get(list.size()-1), HttpStatus.OK);
    }

    @GetMapping("/vitals/{patientId}/recent")
    public List<VitalReading> recent(@PathVariable String patientId) {
        List<VitalReading> list = store.getOrDefault(patientId, Collections.emptyList());
        int n = Math.max(0, list.size()-50);
        return list.subList(n, list.size());
    }

    @GetMapping("/patients")
    public List<Map<String, Object>> patients() {
        List<Map<String, Object>> res = new ArrayList<>();
        for (var e : store.entrySet()) {
            List<VitalReading> list = e.getValue();
            if (list.isEmpty()) continue;
            VitalReading last = list.get(list.size()-1);
            Map<String, Object> m = new HashMap<>();
            m.put("id", e.getKey());
            m.put("risk", last.getRisk());
            m.put("latestAt", last.getTimestamp());
            res.add(m);
        }
        res.sort(Comparator.comparing(m -> ((Long)m.get("latestAt"))));
        Collections.reverse(res);
        return res;
    }

    private final Set<String> simEnabled = Collections.synchronizedSet(new HashSet<>());
    @PostMapping("/simulate/{patientId}")
    public ResponseEntity<?> simulateToggle(@PathVariable String patientId, @RequestParam boolean enable) {
        if (enable) simEnabled.add(patientId); else simEnabled.remove(patientId);
        return new ResponseEntity<>(Map.of("patientId", patientId, "enabled", enable), HttpStatus.OK);
    }

    private Timer timer = new Timer(true);
    public HealthController() {
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override public void run() {
                for (String pid : new HashSet<>(simEnabled)) {
                    VitalReading r = randomReading(pid);
                    ingest(r);
                }
            }
        }, 2000, 3000);
    }

    private VitalReading randomReading(String patientId) {
        double hr = 60 + Math.random()*70;
        double spo2 = 90 + Math.random()*10;
        double temp = 36.5 + Math.random()*2.5;
        VitalReading r = new VitalReading(patientId, System.currentTimeMillis(), hr, spo2, temp, null);
        return r;
    }

    private String callAiRisk(VitalReading r) {
        try {
            Map<String, Object> payload = Map.of(
                "patientId", r.getPatientId(),
                "heartRate", r.getHeartRate(),
                "spo2", r.getSpo2(),
                "temperature", r.getTemperature(),
                "timestamp", r.getTimestamp()
            );
            Map resp = http.postForObject(aiUrl + "/predict", payload, Map.class);
            Object risk = resp != null ? resp.get("risk") : null;
            if (risk instanceof String) return (String) risk;
        } catch (Exception ignored) {}
        return alertService.evaluateRisk(r);
    }

    private void ingest(VitalReading r) {
        String risk = callAiRisk(r);
        r.setRisk(risk);
        store.computeIfAbsent(r.getPatientId(), k -> new ArrayList<>()).add(r);
    }
}
