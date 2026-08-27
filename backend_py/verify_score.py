import requests
import json

# Login as doctor to access insights
BASE_URL = "http://127.0.0.1:8000/api/v1"

def check_health_score():
    # Login
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "umer", "password": "umer@123"})
    if login_resp.status_code != 200:
        print(f"Failed to login: {login_resp.status_code}")
        return
        
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get a patient ID (using one from inspection)
    # We saw "test" user in inspector output, patientId "P021898" or similar?
    # Actually let's use the patients list to grab a valid one
    p_resp = requests.get(f"{BASE_URL}/patients", headers=headers)
    if not p_resp.json():
        print("No patients found")
        return
        
    patient_id = p_resp.json()[0]["id"]
    print(f"Checking insights for patient {patient_id}...")
    
    # Get insights (default week)
    resp = requests.get(f"{BASE_URL}/insights/{patient_id}?period=week", headers=headers)
    
    if resp.status_code != 200:
        print(f"Failed to get insights: {resp.status_code}, {resp.text}")
        return
        
    data = resp.json()
    score = data.get("healthScore")
    points = data.get("dataPoints")
    risks = data.get("riskDistribution", {})
    
    print(f"\nData Points: {points}")
    print(f"Risk Distribution: {risks}")
    print(f"Calculated Health Score: {score}")
    
    if points > 1000 and score == 0:
        print("FAILURE: Score is still 0 with large dataset!")
    elif 0 <= score <= 100:
        print(f"SUCCESS: Score {score} is valid (0-100).")
    else:
        print(f"FAILURE: Score {score} is out of range!")

if __name__ == "__main__":
    check_health_score()
