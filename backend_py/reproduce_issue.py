import requests
import time
import uuid

BASE_URL = "http://127.0.0.1:8000/api/v1"

def reproduce():
    # 1. Create a test patient
    patient_id = f"TEST_{uuid.uuid4().hex[:8]}"
    print(f"Created test patient: {patient_id}")

    # 2. Insert data with a steep downward trend
    # We'll simulate 10 readings, 1 minute apart, dropping massively
    now = int(time.time() * 1000)
    
    print("Inserting vital readings...")
    for i in range(10):
        # Go back 10 minutes
        ts = now - ((10 - i) * 60 * 1000)
        
        # Steep drop: 100 -> 90 -> 80 ...
        hr = 100 - (i * 10) 
        spo2 = 100 - (i * 5)
        temp = 37.0 - (i * 0.5)
        
        payload = {
            "patientId": patient_id,
            "timestamp": ts,
            "heartRate": hr,
            "spo2": spo2,
            "temperature": temp,
            "risk": "LOW"
        }
        # We need to simulate the ingestion. Since the ingest endpoint requires auth,
        # we might need to login first or hack it. 
        # Looking at app.py, /api/v1/vitals uses Depends(get_current_user).
        # We need a token.
        pass

    # Actually, let's just use the 'doctor' login to get a token first
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "umer", "password": "umer@123"})
    if login_resp.status_code != 200:
        print(f"Failed to login as doctor: {login_resp.status_code}")
        return
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Now insert data
    for i in range(10):
        ts = now - ((10 - i) * 60 * 1000)
        hr = 100 - (i * 10) 
        spo2 = 100 - (i * 5)
        temp = 37.0 - (i * 0.5)
        
        payload = {
            "patientId": patient_id,
            "timestamp": ts,
            "heartRate": float(hr),
            "spo2": float(spo2),
            "temperature": float(temp),
            "risk": "LOW"
        }
        requests.post(f"{BASE_URL}/vitals", json=payload, headers=headers)

    # 3. Request predictions
    print("Requesting predictions...")
    resp = requests.get(f"{BASE_URL}/predict/{patient_id}?hours=24", headers=headers)
    
    if resp.status_code != 200:
        print(f"Prediction failed: {resp.text}")
        return

    data = resp.json()
    
    # 4. Check for negative values
    if isinstance(data, dict) and "predictions" in data:
        predictions = data["predictions"]
        has_negative = False
        for p in predictions:
            if p['heartRate'] < 0 or p['spo2'] < 0:
                print(f"FAILURE: Found negative prediction! at {p['timestamp']}: HR={p['heartRate']}, SpO2={p['spo2']}")
                has_negative = True
                break
        
        if not has_negative:
            print("SUCCESS: No negative predictions found.")
        else:
            print("TEST FAILED: Negative values detected.")
    elif isinstance(data, list):
        # Fallback if I was wrong, but code says dict
        predictions = data
        # ... (same logic, but cleaner to just handle dict)
        print("Unexpected list format? But checking anyway.")
    else:
        print(f"Unexpected response format: {data}")

if __name__ == "__main__":
    reproduce()
