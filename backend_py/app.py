from fastapi import FastAPI, Response, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import asyncio
import random
import httpx
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
import jwt
from pathlib import Path
from datetime import datetime

class VitalReading(BaseModel):
    patientId: str
    timestamp: int | None = None
    heartRate: float
    spo2: float
    temperature: float
    risk: str | None = None

class LoginPayload(BaseModel):
    username: str
    password: str

class SignupPayload(BaseModel):
    username: str
    password: str
    role: str
    fullName: str = ""
    email: str = ""
    age: int = 0
    gender: str = ""

class ThresholdUpdate(BaseModel):
    spo2Low: float
    tempHigh: float
    hrHigh: float

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "Smart Health Monitoring API is running", "docs": "/docs"}

# Database setup
class Base(DeclarativeBase):
    pass
engine = create_engine("sqlite:///smarthealth.db", future=True)
SessionLocal = sessionmaker(bind=engine)

class VitalReadingORM(Base):
    __tablename__ = "vital_readings"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patientId: Mapped[str] = mapped_column(index=True)
    timestamp: Mapped[int] = mapped_column(index=True)
    heartRate: Mapped[float]
    spo2: Mapped[float]
    temperature: Mapped[float]
    risk: Mapped[str]

class PatientNote(Base):
    __tablename__ = "patient_notes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patientId: Mapped[str] = mapped_column(index=True)
    author: Mapped[str]
    title: Mapped[str]
    body: Mapped[str]
    createdAt: Mapped[int] = mapped_column(index=True)

class PatientAlert(Base):
    __tablename__ = "patient_alerts"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patientId: Mapped[str] = mapped_column(index=True)
    createdAt: Mapped[int] = mapped_column(index=True)
    level: Mapped[str]
    message: Mapped[str]
    acknowledged: Mapped[int] = mapped_column(index=True)  # 0 or 1
    acknowledgedAt: Mapped[int] = mapped_column(default=0)

class PatientThresholds(Base):
    __tablename__ = "patient_thresholds"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patientId: Mapped[str] = mapped_column(index=True, unique=True)
    spo2Low: Mapped[float]
    tempHigh: Mapped[float]
    hrHigh: Mapped[float]

class PatientDeviceToken(Base):
    __tablename__ = "patient_device_tokens"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patientId: Mapped[str] = mapped_column(index=True)
    token: Mapped[str] = mapped_column(index=True)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(unique=True, index=True)
    password: Mapped[str]
    role: Mapped[str]
    patientId: Mapped[str] = mapped_column(default="")
    fullName: Mapped[str] = mapped_column(default="")
    email: Mapped[str] = mapped_column(default="")
    age: Mapped[int] = mapped_column(default=0)
    gender: Mapped[str] = mapped_column(default="")

# Auth (optional, not enforced yet)
SECRET = "smarthealth-dev-secret"
USERS = {
    "patient": {"username": "patient", "password": "patient", "role": "patient", "patientId": "demo123"},
    "doctor": {"username": "doctor", "password": "doctor", "role": "doctor"}
}

def create_token(payload: dict) -> str:
    return jwt.encode(payload, SECRET, algorithm="HS256")

sim_enabled: set[str] = set()
ai_url = "http://127.0.0.1:8000"

def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except Exception:
        return None

async def get_current_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401)
    token = authorization.removeprefix("Bearer ").strip()
    user = decode_token(token)
    if not user:
        raise HTTPException(status_code=401)
    return user

def save_user_to_file(user: User):
    """Save user data to text file whenever a new account is created"""
    try:
        file_path = Path(__file__).parent / "user_data.txt"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        with open(file_path, 'a', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write(f"Account Created: {timestamp}\n")
            f.write("-" * 80 + "\n")
            f.write(f"ID:           {user.id}\n")
            f.write(f"Username:     {user.username}\n")
            f.write(f"Password:     {user.password}\n")
            f.write(f"Role:         {user.role.upper()}\n")
            if user.patientId:
                f.write(f"Patient ID:   {user.patientId}\n")
            if user.fullName:
                f.write(f"Full Name:    {user.fullName}\n")
            if user.email:
                f.write(f"Email:        {user.email}\n")
            if user.age:
                f.write(f"Age:          {user.age}\n")
            if user.gender:
                f.write(f"Gender:       {user.gender}\n")
            f.write("=" * 80 + "\n\n")
    except Exception as e:
        print(f"Failed to write user data to file: {e}")

DEFAULT_THRESHOLDS = {"spo2Low": 92.0, "tempHigh": 38.5, "hrHigh": 120.0}

def get_thresholds(session, patientId: str):
    t = session.query(PatientThresholds).filter_by(patientId=patientId).first()
    if not t:
        return DEFAULT_THRESHOLDS
    return {"spo2Low": t.spo2Low, "tempHigh": t.tempHigh, "hrHigh": t.hrHigh}

def check_and_create_alerts(session, r: VitalReading, th: dict):
    level = None
    if r.spo2 < th["spo2Low"] or r.temperature >= th["tempHigh"]:
        level = "HIGH"
    elif r.heartRate > th["hrHigh"] or r.temperature >= 37.8:
        level = "MEDIUM"
    if level:
        msg = f"HR {int(r.heartRate)} | SpO2 {int(r.spo2)} | Temp {r.temperature:.1f}"
        alert = PatientAlert(
            patientId=r.patientId,
            createdAt=r.timestamp or int(time.time()*1000),
            level=level,
            message=msg,
            acknowledged=0,
            acknowledgedAt=0,
        )
        session.add(alert)
        if level == "HIGH":
            # send push notifications
            try:
                tokens = [t.token for t in session.query(PatientDeviceToken).filter_by(patientId=r.patientId).all()]
                if tokens:
                    server_key = os.environ.get("FCM_SERVER_KEY", "")
                    if server_key:
                        async def send():
                            async with httpx.AsyncClient(timeout=5.0) as client:
                                await client.post(
                                    "https://fcm.googleapis.com/fcm/send",
                                    headers={"Authorization": f"key={server_key}", "Content-Type": "application/json"},
                                    json={
                                        "registration_ids": tokens,
                                        "notification": {"title": f"{level} Health Alert", "body": msg},
                                        "data": {"patientId": r.patientId, "level": level}
                                    }
                                )
                        asyncio.create_task(send())
            except Exception:
                pass

async def call_ai_risk(r: VitalReading) -> str:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.post(f"{ai_url}/predict", json={
                "patientId": r.patientId,
                "heartRate": r.heartRate,
                "spo2": r.spo2,
                "temperature": r.temperature,
                "timestamp": r.timestamp or int(time.time()*1000),
            })
            data = resp.json()
            risk = data.get("risk")
            if isinstance(risk, str):
                return risk
    except Exception:
        pass
    # Fallback
    if r.spo2 < 92 or r.temperature >= 38.5:
        return "HIGH"
    if r.heartRate > 120 or r.temperature >= 37.8:
        return "MEDIUM"
    return "LOW"

@app.post("/api/v1/vitals")
async def ingest(r: VitalReading, current=Depends(get_current_user)):
    if current.get("role") == "patient" and current.get("patientId") != r.patientId:
        raise HTTPException(status_code=403)
    r.timestamp = r.timestamp or int(time.time()*1000)
    r.risk = await call_ai_risk(r)
    with SessionLocal() as session:
        session.add(VitalReadingORM(
            patientId=r.patientId,
            timestamp=r.timestamp,
            heartRate=r.heartRate,
            spo2=r.spo2,
            temperature=r.temperature,
            risk=r.risk,
        ))
        th = get_thresholds(session, r.patientId)
        check_and_create_alerts(session, r, th)
        session.commit()
    return r

@app.get("/api/v1/vitals/{patientId}/latest")
async def latest(patientId: str, current=Depends(get_current_user)):
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    with SessionLocal() as session:
        row = session.query(VitalReadingORM).filter_by(patientId=patientId).order_by(VitalReadingORM.timestamp.desc()).first()
        if not row:
            return Response(status_code=204)
        return VitalReading(
            patientId=row.patientId,
            timestamp=row.timestamp,
            heartRate=row.heartRate,
            spo2=row.spo2,
            temperature=row.temperature,
            risk=row.risk,
        )

@app.get("/api/v1/vitals/{patientId}/recent")
async def recent(patientId: str, current=Depends(get_current_user), limit: int = 50, fromTs: int | None = None):
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    with SessionLocal() as session:
        q = session.query(VitalReadingORM).filter_by(patientId=patientId)
        if fromTs:
            q = q.filter(VitalReadingORM.timestamp >= fromTs)
        rows = q.order_by(VitalReadingORM.timestamp.desc()).limit(limit).all()
        rows = list(reversed(rows))
        return [VitalReading(
            patientId=r.patientId,
            timestamp=r.timestamp,
            heartRate=r.heartRate,
            spo2=r.spo2,
            temperature=r.temperature,
            risk=r.risk,
        ) for r in rows]

@app.get("/api/v1/patients")
async def patients(current=Depends(get_current_user)):
    if current.get("role") != "doctor":
        raise HTTPException(status_code=403)
    with SessionLocal() as session:
        # Get all patient users
        patient_users = session.query(User).filter_by(role="patient").all()
        res = []
        for user in patient_users:
            if not user.patientId:
                continue
            # Get latest vital reading for this patient
            last = session.query(VitalReadingORM).filter_by(patientId=user.patientId).order_by(VitalReadingORM.timestamp.desc()).first()
            if last:
                res.append({
                    "id": user.patientId,
                    "name": user.fullName or user.username,
                    "risk": last.risk,
                    "latestAt": last.timestamp
                })
        res.sort(key=lambda m: m["latestAt"], reverse=True)
        return res

@app.post("/api/v1/auth/login")
async def login(payload: LoginPayload):
    username = payload.username
    password = payload.password
    with SessionLocal() as session:
        user = session.query(User).filter_by(username=username).first()
        if not user or user.password != password:
            return Response(status_code=401)
        token = create_token({"username": user.username, "role": user.role, "patientId": user.patientId, "fullName": user.fullName})
        return {"token": token, "role": user.role, "patientId": user.patientId, "fullName": user.fullName}

@app.post("/api/v1/auth/signup")
async def signup(payload: SignupPayload):
    with SessionLocal() as session:
        existing = session.query(User).filter_by(username=payload.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        patientId = f"P{str(int(time.time()*1000))[-6:]}" if payload.role == "patient" else ""
        user = User(
            username=payload.username,
            password=payload.password,
            role=payload.role,
            patientId=patientId,
            fullName=payload.fullName,
            email=payload.email,
            age=payload.age,
            gender=payload.gender,
        )
        session.add(user)
        session.commit()
        session.refresh(user)  # Get the ID
        
        # Save user data to file
        save_user_to_file(user)
        
        token = create_token({"username": user.username, "role": user.role, "patientId": user.patientId, "fullName": user.fullName})
        return {"token": token, "role": user.role, "patientId": user.patientId, "fullName": user.fullName}

@app.get("/api/v1/patients/{patientId}/notes")
async def get_notes(patientId: str, current=Depends(get_current_user)):
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    with SessionLocal() as session:
        rows = session.query(PatientNote).filter_by(patientId=patientId).order_by(PatientNote.createdAt.desc()).limit(100).all()
        return [{
            "id": n.id,
            "patientId": n.patientId,
            "author": n.author,
            "title": n.title,
            "body": n.body,
            "createdAt": n.createdAt,
        } for n in rows]

@app.post("/api/v1/patients/{patientId}/notes")
async def add_note(patientId: str, payload: dict, current=Depends(get_current_user)):
    if current.get("role") != "doctor":
        raise HTTPException(status_code=403)
    title = str(payload.get("title") or "").strip()
    body = str(payload.get("body") or "").strip()
    if not title or not body:
        raise HTTPException(status_code=400)
    with SessionLocal() as session:
        note = PatientNote(
            patientId=patientId,
            author=current.get("username") or "doctor",
            title=title,
            body=body,
            createdAt=int(time.time()*1000),
        )
        session.add(note)
        session.commit()
        return {"id": note.id}

@app.post("/api/v1/notify/{patientId}/register")
async def register_token(patientId: str, payload: dict, current=Depends(get_current_user)):
    # Patients can register for themselves; doctors can register for any patient
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    token = str(payload.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=400)
    with SessionLocal() as session:
        # Avoid duplicates
        existing = session.query(PatientDeviceToken).filter_by(patientId=patientId, token=token).first()
        if not existing:
            session.add(PatientDeviceToken(patientId=patientId, token=token))
            session.commit()
    return {"ok": True}

@app.get("/api/v1/admin/users")
async def get_all_users():
    """Admin endpoint to view all registered users"""
    with SessionLocal() as session:
        users = session.query(User).all()
        return [{
            "id": u.id,
            "username": u.username,
            "password": u.password,  # In production, never expose passwords!
            "role": u.role,
            "patientId": u.patientId,
            "fullName": u.fullName,
            "email": u.email,
            "age": u.age,
            "gender": u.gender,
        } for u in users]

@app.get("/api/v1/thresholds/{patientId}")
async def get_thresholds_endpoint(patientId: str, current=Depends(get_current_user)):
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    with SessionLocal() as session:
        return get_thresholds(session, patientId)

@app.post("/api/v1/thresholds/{patientId}")
async def set_thresholds_endpoint(patientId: str, payload: ThresholdUpdate, current=Depends(get_current_user)):
    if current.get("role") != "doctor":
        raise HTTPException(status_code=403)
    with SessionLocal() as session:
        t = session.query(PatientThresholds).filter_by(patientId=patientId).first()
        if not t:
            t = PatientThresholds(patientId=patientId, spo2Low=payload.spo2Low, tempHigh=payload.tempHigh, hrHigh=payload.hrHigh)
            session.add(t)
        else:
            t.spo2Low = payload.spo2Low
            t.tempHigh = payload.tempHigh
            t.hrHigh = payload.hrHigh
        session.commit()
        return {"ok": True}

@app.get("/api/v1/alerts/{patientId}")
async def list_alerts(patientId: str, activeOnly: bool = True, current=Depends(get_current_user)):
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    with SessionLocal() as session:
        q = session.query(PatientAlert).filter_by(patientId=patientId)
        if activeOnly:
            q = q.filter(PatientAlert.acknowledged == 0)
        rows = q.order_by(PatientAlert.createdAt.desc()).limit(100).all()
        return [{
            "id": a.id,
            "patientId": a.patientId,
            "createdAt": a.createdAt,
            "level": a.level,
            "message": a.message,
            "acknowledged": bool(a.acknowledged),
        } for a in rows]

@app.post("/api/v1/alerts/{alertId}/ack")
async def ack_alert(alertId: int, current=Depends(get_current_user)):
    with SessionLocal() as session:
        a = session.query(PatientAlert).filter_by(id=alertId).first()
        if not a:
            raise HTTPException(status_code=404)
        if current.get("role") == "patient" and current.get("patientId") != a.patientId:
            raise HTTPException(status_code=403)
        a.acknowledged = 1
        a.acknowledgedAt = int(time.time()*1000)
        session.commit()
        return {"ok": True}

@app.post("/api/v1/simulate/{patientId}")
async def simulate_toggle(patientId: str, enable: bool, current=Depends(get_current_user)):
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    if enable:
        sim_enabled.add(patientId)
    else:
        sim_enabled.discard(patientId)
    return {"patientId": patientId, "enabled": enable}

@app.get("/api/v1/insights/{patientId}")
async def get_health_insights(patientId: str, period: str = "week", current=Depends(get_current_user)):
    """Get health insights and trends for a patient"""
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    
    with SessionLocal() as session:
        now = int(time.time() * 1000)
        if period == "week":
            start_time = now - (7 * 24 * 60 * 60 * 1000)
        elif period == "month":
            start_time = now - (30 * 24 * 60 * 60 * 1000)
        else:
            start_time = now - (7 * 24 * 60 * 60 * 1000)  # Default to week
        
        # Get readings for the period
        readings = session.query(VitalReadingORM).filter(
            VitalReadingORM.patientId == patientId,
            VitalReadingORM.timestamp >= start_time
        ).order_by(VitalReadingORM.timestamp.asc()).all()
        
        if len(readings) < 2:
            return {
                "period": period,
                "message": "Not enough data for insights",
                "dataPoints": len(readings)
            }
        
        # Calculate averages
        avg_hr = sum(r.heartRate for r in readings) / len(readings)
        avg_spo2 = sum(r.spo2 for r in readings) / len(readings)
        avg_temp = sum(r.temperature for r in readings) / len(readings)
        
        # Calculate trends (compare first half vs second half)
        mid = len(readings) // 2
        first_half_hr = sum(r.heartRate for r in readings[:mid]) / mid if mid > 0 else avg_hr
        second_half_hr = sum(r.heartRate for r in readings[mid:]) / (len(readings) - mid) if len(readings) > mid else avg_hr
        
        first_half_spo2 = sum(r.spo2 for r in readings[:mid]) / mid if mid > 0 else avg_spo2
        second_half_spo2 = sum(r.spo2 for r in readings[mid:]) / (len(readings) - mid) if len(readings) > mid else avg_spo2
        
        first_half_temp = sum(r.temperature for r in readings[:mid]) / mid if mid > 0 else avg_temp
        second_half_temp = sum(r.temperature for r in readings[mid:]) / (len(readings) - mid) if len(readings) > mid else avg_temp
        
        # Calculate percentage changes
        hr_change = ((second_half_hr - first_half_hr) / first_half_hr * 100) if first_half_hr > 0 else 0
        spo2_change = ((second_half_spo2 - first_half_spo2) / first_half_spo2 * 100) if first_half_spo2 > 0 else 0
        temp_change = ((second_half_temp - first_half_temp) / first_half_temp * 100) if first_half_temp > 0 else 0
        
        # Count risk levels
        risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
        for r in readings:
            risk_counts[r.risk] = risk_counts.get(r.risk, 0) + 1
        
        # Generate insights
        insights = []
        
        if hr_change < -5:
            insights.append({
                "type": "positive",
                "title": "Heart Rate Improving",
                "message": f"Your heart rate has decreased by {abs(hr_change):.1f}%, indicating improved cardiovascular health."
            })
        elif hr_change > 5:
            insights.append({
                "type": "warning",
                "title": "Heart Rate Increasing",
                "message": f"Your heart rate has increased by {hr_change:.1f}%. Consider consulting your doctor."
            })
        
        if spo2_change > 2:
            insights.append({
                "type": "positive",
                "title": "Oxygen Levels Improving",
                "message": f"Your oxygen saturation has improved by {spo2_change:.1f}%."
            })
        elif spo2_change < -2:
            insights.append({
                "type": "warning",
                "title": "Oxygen Levels Declining",
                "message": f"Your oxygen saturation has decreased by {abs(spo2_change):.1f}%. Monitor closely."
            })
        
        if risk_counts["HIGH"] > len(readings) * 0.1:  # More than 10% high risk
            insights.append({
                "type": "critical",
                "title": "Frequent High Risk Alerts",
                "message": f"You've had {risk_counts['HIGH']} high-risk readings. Please consult your doctor."
            })
        elif risk_counts["LOW"] > len(readings) * 0.8:  # More than 80% low risk
            insights.append({
                "type": "positive",
                "title": "Excellent Health Status",
                "message": f"{risk_counts['LOW']} out of {len(readings)} readings were in the safe range. Keep it up!"
            })
        
        # Health score (0-100)
        health_score = 100
        if avg_hr > 100:
            health_score -= 10
        if avg_spo2 < 95:
            health_score -= 15
        if avg_temp > 37.5:
            health_score -= 10
            
        # Risk distribution penalty (based on percentage)
        total_readings = len(readings)
        if total_readings > 0:
            percent_high = (risk_counts["HIGH"] / total_readings) * 100
            percent_medium = (risk_counts["MEDIUM"] / total_readings) * 100
            
            # Weighted penalty: High risk contributes more to score reduction
            # Max possible penalty from risk is ~65 points
            health_score -= (percent_high * 0.5)    # e.g., 50% high -> -25 pts
            health_score -= (percent_medium * 0.2)  # e.g., 50% medium -> -10 pts
            
        health_score = max(0, min(100, health_score))
        
        return {
            "period": period,
            "dataPoints": len(readings),
            "averages": {
                "heartRate": round(avg_hr, 1),
                "spo2": round(avg_spo2, 1),
                "temperature": round(avg_temp, 2)
            },
            "trends": {
                "heartRate": {
                    "change": round(hr_change, 1),
                    "direction": "improving" if hr_change < -2 else "worsening" if hr_change > 2 else "stable"
                },
                "spo2": {
                    "change": round(spo2_change, 1),
                    "direction": "improving" if spo2_change > 1 else "worsening" if spo2_change < -1 else "stable"
                },
                "temperature": {
                    "change": round(temp_change, 1),
                    "direction": "improving" if temp_change < -1 else "worsening" if temp_change > 1 else "stable"
                }
            },
            "riskDistribution": risk_counts,
            "healthScore": health_score,
            "insights": insights,
            "startTime": start_time,
            "endTime": now
        }

@app.get("/api/v1/report/{patientId}")
async def generate_report_data(patientId: str, current=Depends(get_current_user)):
    """Get data for PDF report generation"""
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    
    with SessionLocal() as session:
        # Get patient info
        user = session.query(User).filter_by(patientId=patientId).first()
        if not user:
            raise HTTPException(status_code=404)
        
        # Get recent readings (last 100)
        readings = session.query(VitalReadingORM).filter_by(patientId=patientId).order_by(VitalReadingORM.timestamp.desc()).limit(100).all()
        
        # Get alerts
        alerts = session.query(PatientAlert).filter_by(patientId=patientId).order_by(PatientAlert.createdAt.desc()).limit(50).all()
        
        # Get notes
        notes = session.query(PatientNote).filter_by(patientId=patientId).order_by(PatientNote.createdAt.desc()).limit(20).all()
        
        # Get thresholds
        thresholds = get_thresholds(session, patientId)
        
        # Get latest reading
        latest = session.query(VitalReadingORM).filter_by(patientId=patientId).order_by(VitalReadingORM.timestamp.desc()).first()
        
        return {
            "patient": {
                "id": patientId,
                "name": user.fullName or user.username,
                "age": user.age,
                "gender": user.gender,
                "email": user.email
            },
            "reportDate": datetime.now().isoformat(),
            "latestReading": {
                "heartRate": latest.heartRate if latest else None,
                "spo2": latest.spo2 if latest else None,
                "temperature": latest.temperature if latest else None,
                "risk": latest.risk if latest else None,
                "timestamp": latest.timestamp if latest else None
            },
            "thresholds": thresholds,
            "readings": [{
                "timestamp": r.timestamp,
                "heartRate": r.heartRate,
                "spo2": r.spo2,
                "temperature": r.temperature,
                "risk": r.risk
            } for r in readings],
            "alerts": [{
                "level": a.level,
                "message": a.message,
                "createdAt": a.createdAt,
                "acknowledged": bool(a.acknowledged)
            } for a in alerts],
            "notes": [{
                "title": n.title,
                "body": n.body,
                "author": n.author,
                "createdAt": n.createdAt
            } for n in notes]
        }

@app.get("/api/v1/predict/{patientId}")
async def predict_health_trends(patientId: str, hours: int = 24, current=Depends(get_current_user)):
    """Predict future vital signs using ML (Linear Regression)"""
    if current.get("role") == "patient" and current.get("patientId") != patientId:
        raise HTTPException(status_code=403)
    
    with SessionLocal() as session:
        # Get recent readings (last 50 for training)
        readings = session.query(VitalReadingORM).filter_by(patientId=patientId).order_by(VitalReadingORM.timestamp.desc()).limit(50).all()
        
        if len(readings) < 5:
            return {
                "error": "Not enough data for prediction",
                "required": 5,
                "available": len(readings)
            }
        
        # Reverse to get chronological order
        readings = list(reversed(readings))
        
        # Simple Linear Regression function
        def linear_regression(x_values, y_values):
            n = len(x_values)
            if n < 2:
                return None, None
            
            sum_x = sum(x_values)
            sum_y = sum(y_values)
            sum_xy = sum(x * y for x, y in zip(x_values, y_values))
            sum_x2 = sum(x * x for x in x_values)
            
            # Calculate slope and intercept
            denominator = n * sum_x2 - sum_x * sum_x
            if abs(denominator) < 1e-10:
                return None, None
            
            slope = (n * sum_xy - sum_x * sum_y) / denominator
            intercept = (sum_y - slope * sum_x) / n
            
            return slope, intercept
        
        # Prepare data: use time as x, vital as y
        timestamps = [r.timestamp for r in readings]
        # Normalize timestamps (use relative time from first reading)
        base_time = timestamps[0]
        x_values = [(ts - base_time) / (1000 * 60) for ts in timestamps]  # Convert to minutes
        
        # Predict each vital sign
        hr_values = [r.heartRate for r in readings]
        spo2_values = [r.spo2 for r in readings]
        temp_values = [r.temperature for r in readings]
        
        # Train models
        hr_slope, hr_intercept = linear_regression(x_values, hr_values)
        spo2_slope, spo2_intercept = linear_regression(x_values, spo2_values)
        temp_slope, temp_intercept = linear_regression(x_values, temp_values)
        
        if hr_slope is None:
            return {"error": "Insufficient data variation for prediction"}
        
        # Generate predictions for next N hours
        last_timestamp = timestamps[-1]
        predictions = []
        interval_minutes = 30  # Predict every 30 minutes
        
        for i in range(0, hours * 2 + 1):  # +1 to include current time
            minutes_ahead = i * interval_minutes
            future_time = last_timestamp + (minutes_ahead * 60 * 1000)
            relative_minutes = (future_time - base_time) / (1000 * 60)
            
            # Predict values
            pred_hr = hr_intercept + hr_slope * relative_minutes
            pred_spo2 = spo2_intercept + spo2_slope * relative_minutes
            pred_temp = temp_intercept + temp_slope * relative_minutes
            
            # Calculate confidence (decreases over time)
            confidence = max(0.5, 1.0 - (minutes_ahead / (hours * 60 * 2)))
            
            # Determine predicted risk
            pred_risk = "LOW"
            if pred_spo2 < 92 or pred_temp >= 38.5:
                pred_risk = "HIGH"
            elif pred_hr > 120 or pred_temp >= 37.8:
                pred_risk = "MEDIUM"
            
            predictions.append({
                "timestamp": future_time,
                "heartRate": round(max(30, min(220, pred_hr)), 1),
                "spo2": round(max(0, min(100, pred_spo2)), 1),
                "temperature": round(max(30, min(45, pred_temp)), 2),
                "risk": pred_risk,
                "confidence": round(confidence, 2)
            })
        
        # Get thresholds for warnings
        thresholds = get_thresholds(session, patientId)
        
        # Check if any predictions exceed thresholds
        warnings = []
        for pred in predictions:
            if pred["spo2"] < thresholds["spo2Low"]:
                warnings.append({
                    "timestamp": pred["timestamp"],
                    "type": "SpO₂",
                    "message": f"Predicted SpO₂ ({pred['spo2']:.1f}%) may drop below threshold ({thresholds['spo2Low']}%)",
                    "severity": "HIGH"
                })
            if pred["temperature"] >= thresholds["tempHigh"]:
                warnings.append({
                    "timestamp": pred["timestamp"],
                    "type": "Temperature",
                    "message": f"Predicted temperature ({pred['temperature']:.1f}°C) may exceed threshold ({thresholds['tempHigh']}°C)",
                    "severity": "HIGH"
                })
            if pred["heartRate"] > thresholds["hrHigh"]:
                warnings.append({
                    "timestamp": pred["timestamp"],
                    "type": "Heart Rate",
                    "message": f"Predicted heart rate ({pred['heartRate']:.0f} bpm) may exceed threshold ({thresholds['hrHigh']} bpm)",
                    "severity": "MEDIUM"
                })
        
        return {
            "patientId": patientId,
            "predictionHours": hours,
            "dataPoints": len(readings),
            "model": {
                "heartRate": {"slope": round(hr_slope, 4), "intercept": round(hr_intercept, 2)},
                "spo2": {"slope": round(spo2_slope, 4), "intercept": round(spo2_intercept, 2)},
                "temperature": {"slope": round(temp_slope, 4), "intercept": round(temp_intercept, 2)}
            },
            "predictions": predictions,
            "warnings": warnings,
            "lastReading": {
                "timestamp": last_timestamp,
                "heartRate": readings[-1].heartRate,
                "spo2": readings[-1].spo2,
                "temperature": readings[-1].temperature
            }
        }

async def simulator_loop():
    while True:
        await asyncio.sleep(3)
        for pid in list(sim_enabled):
            r = VitalReading(
                patientId=pid,
                timestamp=int(time.time()*1000),
                heartRate=60 + random.random()*70,
                spo2=90 + random.random()*10,
                temperature=36.5 + random.random()*2.5,
            )
            # Calculate risk directly
            if r.spo2 < 92 or r.temperature >= 38.5:
                r.risk = "HIGH"
            elif r.heartRate > 120 or r.temperature >= 37.8:
                r.risk = "MEDIUM"
            else:
                r.risk = "LOW"

            with SessionLocal() as session:
                session.add(VitalReadingORM(
                    patientId=pid,
                    timestamp=r.timestamp,
                    heartRate=r.heartRate,
                    spo2=r.spo2,
                    temperature=r.temperature,
                    risk=r.risk,
                ))
                th = get_thresholds(session, pid)
                check_and_create_alerts(session, r, th)
                session.commit()

@app.get("/api/admin/users")
def get_admin_users(current=Depends(get_current_user)):
    if current.get("role") not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Only doctors and admins can view the database.")
    with SessionLocal() as session:
        users = session.query(User).all()
        user_list = []
        for u in users:
            user_list.append({
                "id": u.id,
                "username": u.username,
                "role": u.role,
                "patientId": u.patientId,
                "fullName": u.fullName,
                "email": u.email,
                "age": u.age,
                "gender": u.gender
            })
        return {"users": user_list, "total": len(user_list)}

@app.get("/api/admin/stats")
def get_admin_stats(current=Depends(get_current_user)):
    if current.get("role") not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Only doctors and admins can view database stats.")
    with SessionLocal() as session:
        total_users = session.query(User).count()
        total_vitals = session.query(VitalReadingORM).count()
        patients_count = session.query(User).filter(User.role == "patient").count()
        doctors_count = session.query(User).filter(User.role == "doctor").count()
        total_alerts = session.query(PatientAlert).count()
        return {
            "totalUsers": total_users,
            "totalVitals": total_vitals,
            "patientCount": patients_count,
            "doctorCount": doctors_count,
            "alertCount": total_alerts
        }


@app.on_event("startup")
async def on_start():
    Base.metadata.create_all(engine)
    asyncio.create_task(simulator_loop())

