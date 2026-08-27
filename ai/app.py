from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class Reading(BaseModel):
    patientId: str
    heartRate: float
    spo2: float
    temperature: float
    timestamp: float | None = None

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def evaluate_risk(r: Reading):
    if r.spo2 < 92 or r.temperature >= 38.5:
        return "HIGH"
    if r.heartRate > 120 or r.temperature >= 37.8:
        return "MEDIUM"
    return "LOW"

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/predict")
def predict(reading: Reading):
    risk = evaluate_risk(reading)
    return {"risk": risk}
