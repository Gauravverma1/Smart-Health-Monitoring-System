# Smart Health Monitoring System - Complete Project Overview

## 🎯 **What is This Project?**

**Smart Health Monitoring** is a full-stack web application that monitors patient vital signs (heart rate, oxygen saturation, temperature) in real-time, provides health risk assessment, and enables doctors to manage multiple patients. It's essentially a **remote patient monitoring (RPM) system** with an AI-powered chatbot assistant.

---

## 🏗️ **Project Architecture**

Your project has **3 main components**:

### 1. **Frontend** (React + TypeScript + Vite)
- **Location**: `frontend/`
- **Port**: 5173
- **Technology**: React 18, TypeScript, Vite, Recharts (for charts)
- **Purpose**: User interface for patients and doctors

### 2. **Backend - Python** (FastAPI)
- **Location**: `backend_py/`
- **Port**: 8000
- **Technology**: FastAPI, SQLAlchemy, SQLite, JWT
- **Purpose**: Main API server handling authentication, data storage, alerts, and business logic

### 3. **Backend - Java** (Spring Boot) [Optional/Alternative]
- **Location**: `backend/`
- **Port**: 8080
- **Technology**: Spring Boot, Java 17
- **Purpose**: Alternative backend implementation (currently not actively used by frontend)

### 4. **AI Service** (FastAPI)
- **Location**: `ai/`
- **Port**: 8000 (same as Python backend, but different endpoint)
- **Technology**: FastAPI
- **Purpose**: Risk assessment service that evaluates vital signs

---

## 📊 **Database Schema**

The Python backend uses **SQLite** (`smarthealth.db`) with these tables:

### **Users Table**
```sql
- id (Primary Key)
- username (Unique)
- password
- role ('patient' or 'doctor')
- patientId (for patients only, e.g., "P123456")
- fullName
- email
- age
- gender
```

### **Vital Readings Table**
```sql
- id (Primary Key)
- patientId (Indexed)
- timestamp (Indexed)
- heartRate (float)
- spo2 (float) - Oxygen saturation
- temperature (float)
- risk ('LOW', 'MEDIUM', 'HIGH')
```

### **Patient Alerts Table**
```sql
- id (Primary Key)
- patientId (Indexed)
- createdAt (Indexed)
- level ('HIGH', 'MEDIUM', 'LOW')
- message
- acknowledged (0 or 1)
- acknowledgedAt
```

### **Patient Notes Table**
```sql
- id (Primary Key)
- patientId (Indexed)
- author (doctor username)
- title
- body
- createdAt (Indexed)
```

### **Patient Thresholds Table**
```sql
- id (Primary Key)
- patientId (Unique, Indexed)
- spo2Low (default: 92.0)
- tempHigh (default: 38.5)
- hrHigh (default: 120.0)
```

### **Patient Device Tokens Table**
```sql
- id (Primary Key)
- patientId (Indexed)
- token (Indexed) - For push notifications
```

---

## 🔐 **Authentication System**

### **How It Works:**
1. User signs up or logs in via frontend
2. Backend validates credentials against `users` table
3. Backend generates a **JWT token** containing:
   - `username`
   - `role` (patient/doctor)
   - `patientId` (for patients)
   - `fullName`
4. Token is stored in browser's `localStorage`
5. All subsequent API requests include: `Authorization: Bearer <token>`
6. Backend validates token on each request

### **Security:**
- Passwords are stored in **plain text** (NOT secure - should use hashing in production!)
- JWT secret: `"smarthealth-dev-secret"` (hardcoded)
- CORS enabled for all origins (`*`)

---

## 🚀 **How the System Works - Step by Step**

### **1. User Registration/Login**

**Signup Flow:**
```
User fills form → POST /api/v1/auth/signup
  ↓
Backend checks if username exists
  ↓
Creates user in database
  ↓
Generates patientId (e.g., "P123456") if role is "patient"
  ↓
Saves user data to user_data.txt file
  ↓
Returns JWT token + user info
  ↓
Frontend stores token, redirects to dashboard
```

**Login Flow:**
```
User enters credentials → POST /api/v1/auth/login
  ↓
Backend queries users table
  ↓
Validates password (plain text comparison)
  ↓
Returns JWT token + user info
  ↓
Frontend stores token, shows appropriate dashboard
```

---

### **2. Patient Dashboard Flow**

**When a patient logs in:**

1. **Dashboard Loads:**
   - Shows patient ID and current risk level
   - Displays 3 KPI cards: Heart Rate, SpO₂, Temperature
   - Shows real-time charts
   - Lists active alerts

2. **Data Polling:**
   - Every 2 seconds, frontend makes 3 API calls:
     - `GET /api/v1/vitals/{patientId}/latest` - Latest reading
     - `GET /api/v1/vitals/{patientId}/recent` - Last 50 readings
     - `GET /api/v1/alerts/{patientId}?activeOnly=true` - Active alerts

3. **Simulation Feature:**
   - Patient clicks "Start Simulation"
   - Frontend calls: `POST /api/v1/simulate/{patientId}?enable=true`
   - Backend adds patientId to `sim_enabled` set
   - **Background simulator loop** (runs every 3 seconds):
     - Generates random vital readings:
       - Heart Rate: 60-130 bpm
       - SpO₂: 90-100%
       - Temperature: 36.5-39°C
     - Calls AI service to get risk assessment
     - Saves reading to database
     - Checks thresholds and creates alerts if needed

4. **Alert Generation:**
   - When a new vital reading is saved:
     - Backend gets patient's thresholds (or uses defaults)
     - Checks:
       - **HIGH risk**: SpO₂ < threshold OR Temperature ≥ 38.5°C
       - **MEDIUM risk**: Heart Rate > threshold OR Temperature ≥ 37.8°C
     - Creates alert in database
     - If HIGH risk: Attempts to send push notification (if FCM configured)

5. **Chatbot:**
   - Patient can ask health questions
   - Chatbot has access to current vitals
   - Can answer questions about:
     - Current heart rate, SpO₂, temperature, risk level
     - General health topics (exercise, diet, sleep, etc.)
     - Symptom assessment (headache, fever with multi-step conversation)

---

### **3. Doctor Dashboard Flow**

**When a doctor logs in:**

1. **Patient List:**
   - Every 3 seconds, fetches: `GET /api/v1/patients`
   - Shows all patients with:
     - Name and Patient ID
     - Current risk level
     - Last reading timestamp

2. **Selecting a Patient:**
   - Doctor clicks on a patient
   - Frontend loads:
     - Vital history charts (last 100 readings)
     - Recent vitals table (last 20)
     - Active alerts
     - Clinical notes
     - Alert thresholds

3. **Managing Thresholds:**
   - Doctor can adjust:
     - SpO₂ Low threshold (default: 92%)
     - Temperature High threshold (default: 38.5°C)
     - Heart Rate High threshold (default: 120 bpm)
   - Saves via: `POST /api/v1/thresholds/{patientId}`

4. **Adding Clinical Notes:**
   - Doctor enters title and body
   - Saves via: `POST /api/v1/patients/{patientId}/notes`
   - Notes are stored with author (doctor username) and timestamp

5. **Acknowledging Alerts:**
   - Doctor can mark alerts as acknowledged
   - Updates alert status via: `POST /api/v1/alerts/{alertId}/ack`

---

## 🤖 **AI Risk Assessment**

### **How Risk is Calculated:**

The system has **two ways** to assess risk:

#### **Method 1: AI Service** (Primary)
- **Endpoint**: `POST http://127.0.0.1:8000/predict` (from `ai/app.py`)
- **Input**: `{patientId, heartRate, spo2, temperature, timestamp}`
- **Logic**:
  ```python
  if spo2 < 92 or temperature >= 38.5:
      return "HIGH"
  if heartRate > 120 or temperature >= 37.8:
      return "MEDIUM"
  return "LOW"
  ```

#### **Method 2: Fallback** (If AI service unavailable)
- Uses same logic in `AlertService.java` or `backend_py/app.py`
- Same thresholds, but runs locally

**Risk Levels:**
- **LOW**: All vitals within normal ranges
- **MEDIUM**: Heart rate > 120 OR temperature ≥ 37.8°C
- **HIGH**: SpO₂ < 92% OR temperature ≥ 38.5°C

---

## 📡 **API Endpoints Reference**

### **Authentication**
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/signup` - Register new user

### **Vital Readings**
- `POST /api/v1/vitals` - Submit new vital reading (requires auth)
- `GET /api/v1/vitals/{patientId}/latest` - Get latest reading
- `GET /api/v1/vitals/{patientId}/recent?limit=50&fromTs=...` - Get recent readings

### **Patients** (Doctor only)
- `GET /api/v1/patients` - List all patients with latest readings

### **Alerts**
- `GET /api/v1/alerts/{patientId}?activeOnly=true` - Get alerts
- `POST /api/v1/alerts/{alertId}/ack` - Acknowledge alert

### **Thresholds** (Doctor only)
- `GET /api/v1/thresholds/{patientId}` - Get thresholds
- `POST /api/v1/thresholds/{patientId}` - Update thresholds

### **Notes** (Doctor only)
- `GET /api/v1/patients/{patientId}/notes` - Get notes
- `POST /api/v1/patients/{patientId}/notes` - Add note

### **Simulation**
- `POST /api/v1/simulate/{patientId}?enable=true/false` - Toggle simulation

### **Notifications**
- `POST /api/v1/notify/{patientId}/register` - Register device token for push notifications

### **Admin**
- `GET /api/v1/admin/users` - List all users (no auth required - security issue!)

---

## 🔄 **Data Flow Diagrams**

### **Vital Reading Submission:**
```
Device/Simulator
  ↓
POST /api/v1/vitals
  ↓
Backend validates token
  ↓
Calls AI service: POST /predict
  ↓
AI returns risk level
  ↓
Backend saves to vital_readings table
  ↓
Backend checks thresholds
  ↓
If threshold exceeded → Create alert
  ↓
If HIGH risk → Send push notification (if configured)
  ↓
Return reading with risk level
```

### **Real-time Monitoring:**
```
Frontend (every 2 seconds)
  ↓
GET /api/v1/vitals/{patientId}/latest
GET /api/v1/vitals/{patientId}/recent
GET /api/v1/alerts/{patientId}
  ↓
Backend queries database
  ↓
Returns JSON data
  ↓
Frontend updates UI (charts, KPIs, alerts)
```

---

## 🎨 **Frontend Components**

### **App.tsx** (Main App)
- Manages authentication state
- Routes between Login/Signup and Dashboards
- Handles theme switching (light/dark)
- Stores JWT token in localStorage

### **LoginPage.tsx**
- Username/password form
- Calls `/api/v1/auth/login`
- On success, calls `onLogin` callback

### **SignupPage.tsx**
- Registration form with:
  - Role selection (Patient/Doctor)
  - Username, password
  - Full name, email, age, gender
- Calls `/api/v1/auth/signup`
- On success, calls `onSignup` callback

### **PatientDashboard.tsx**
- **Chatbot** (top section)
- **Patient info card** with risk badge
- **Welcome message** (if no data)
- **Alert banner** (if active alerts)
- **Simulation toggle** button
- **3 KPI cards**: Heart Rate, SpO₂, Temperature
- **2 Charts**: Heart Rate trend, SpO₂ & Temperature trend
- **Alerts list** (last 10)

### **DoctorDashboard.tsx**
- **Stats cards**: Total patients, High risk count, Active alerts
- **Patient list table** (clickable rows)
- **Patient detail view** (when selected):
  - 2 charts (Heart Rate, SpO₂ & Temp)
  - Recent vitals table
  - Active alerts list
  - Threshold controls
  - Clinical notes section

### **ChatBot.tsx**
- Interactive health assistant
- **Features**:
  - Answers questions about current vitals
  - Provides health information
  - Multi-step symptom assessment (headache, fever)
  - Personalized responses based on actual vital data

---

## 🛠️ **Key Technologies & Libraries**

### **Frontend:**
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Recharts**: Chart library for vital trends
- **CSS-in-JS**: Inline styles with CSS variables

### **Backend (Python):**
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database
- **SQLite**: Embedded database
- **PyJWT**: JWT token generation/validation
- **Uvicorn**: ASGI server
- **httpx**: Async HTTP client (for AI service calls)

### **Backend (Java):**
- **Spring Boot 3.3.0**: Java framework
- **Maven**: Build tool
- **Java 17**: Language version

### **AI Service:**
- **FastAPI**: Simple risk assessment endpoint

---

## 🔧 **Configuration Files**

### **frontend/vite.config.js**
- Configures Vite dev server
- Sets port 5173
- Enables host access

### **frontend/package.json**
- Lists dependencies
- Defines scripts: `dev`, `build`, `preview`
- Sets `type: "module"` for ESM support

### **backend/src/main/resources/application.properties**
- Spring Boot config
- Sets server port: 8080

### **backend_py/app.py**
- Main FastAPI application
- Database connection string: `sqlite:///smarthealth.db`
- JWT secret: `"smarthealth-dev-secret"`
- Default thresholds defined

---

## 🚨 **Alert System Details**

### **Alert Creation Logic:**
```python
def check_and_create_alerts(session, r: VitalReading, th: dict):
    level = None
    if r.spo2 < th["spo2Low"] or r.temperature >= th["tempHigh"]:
        level = "HIGH"
    elif r.heartRate > th["hrHigh"] or r.temperature >= 37.8:
        level = "MEDIUM"
    
    if level:
        # Create alert in database
        # If HIGH, send push notification
```

### **Push Notifications:**
- Uses Firebase Cloud Messaging (FCM)
- Requires `FCM_SERVER_KEY` environment variable
- Sends to all registered device tokens for the patient
- Only triggers for HIGH risk alerts

---

## 📱 **Simulation System**

### **How It Works:**
1. Patient clicks "Start Simulation"
2. Backend adds `patientId` to `sim_enabled` set
3. Background task (runs every 3 seconds):
   ```python
   async def simulator_loop():
       while True:
           await asyncio.sleep(3)
           for pid in sim_enabled:
               # Generate random vitals
               # Save to database
               # Check alerts
   ```

### **Random Value Ranges:**
- Heart Rate: 60-130 bpm
- SpO₂: 90-100%
- Temperature: 36.5-39°C

---

## 🔍 **Security Considerations**

### **Current Issues (Not Production-Ready):**
1. ❌ **Passwords stored in plain text** - Should use bcrypt/argon2
2. ❌ **JWT secret hardcoded** - Should be in environment variable
3. ❌ **CORS allows all origins** - Should restrict to specific domains
4. ❌ **Admin endpoint has no auth** - `/api/v1/admin/users` is open
5. ❌ **No rate limiting** - Vulnerable to brute force
6. ❌ **No input validation** - SQL injection possible (though SQLAlchemy helps)
7. ❌ **No HTTPS** - All traffic is unencrypted

### **What's Good:**
- ✅ JWT-based authentication
- ✅ Role-based access control (patient can only see own data)
- ✅ Token validation on protected endpoints
- ✅ SQLAlchemy ORM (prevents some SQL injection)

---

## 📂 **File Structure Explained**

```
project3/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main app component
│   │   ├── main.tsx       # React entry point
│   │   └── components/
│   │       ├── LoginPage.tsx
│   │       ├── SignupPage.tsx
│   │       ├── PatientDashboard.tsx
│   │       ├── DoctorDashboard.tsx
│   │       └── ChatBot.tsx
│   ├── index.html         # HTML template
│   ├── package.json       # Dependencies
│   └── vite.config.js     # Vite config
│
├── backend_py/            # Python FastAPI backend (MAIN)
│   ├── app.py            # Main application
│   ├── smarthealth.db    # SQLite database
│   ├── user_data.txt     # User registration log
│   └── requirements.txt  # Python dependencies
│
├── backend/               # Java Spring Boot (alternative)
│   ├── src/main/java/
│   │   └── com/smarthealth/
│   │       ├── MonitoringApplication.java
│   │       ├── controller/HealthController.java
│   │       ├── model/VitalReading.java
│   │       └── service/AlertService.java
│   └── pom.xml           # Maven config
│
└── ai/                   # AI risk assessment service
    ├── app.py            # FastAPI app
    └── requirements.txt
```

---

## 🎯 **Use Cases**

### **For Patients:**
1. Monitor their own vital signs in real-time
2. See visual trends over time
3. Get alerts when vitals are abnormal
4. Chat with health assistant about symptoms
5. View their risk level

### **For Doctors:**
1. Monitor multiple patients simultaneously
2. View detailed vital trends for each patient
3. Set custom alert thresholds per patient
4. Add clinical notes
5. Acknowledge and track alerts
6. Register device tokens for push notifications

---

## 🚀 **How to Run (Summary)**

1. **Frontend**: `cd frontend && npm run dev` (port 5173)
2. **Python Backend**: `cd backend_py && python -m uvicorn app:app --port 8000` (port 8000)
3. **Java Backend** (optional): `cd backend && mvn spring-boot:run` (port 8080)
4. **AI Service** (optional, runs on same port as Python backend)

**Note**: Frontend connects to Python backend on port 8000. Java backend is not currently used by the frontend.

---

## 🔮 **Potential Enhancements**

1. **Real Device Integration**: Connect actual medical devices via Bluetooth/USB
2. **Machine Learning**: Train ML model for better risk prediction
3. **Telemedicine**: Video calls between doctors and patients
4. **Mobile App**: React Native version
5. **Email Notifications**: Send alerts via email
6. **Data Export**: PDF reports for patients
7. **Multi-tenant**: Support multiple hospitals/clinics
8. **Audit Logs**: Track all data access
9. **Backup System**: Automated database backups
10. **Analytics Dashboard**: Aggregate statistics and trends

---

## 📝 **Summary**

This is a **comprehensive remote patient monitoring system** that:
- ✅ Tracks vital signs in real-time
- ✅ Provides AI-powered risk assessment
- ✅ Generates alerts for abnormal readings
- ✅ Offers role-based dashboards (patient/doctor)
- ✅ Includes an interactive health chatbot
- ✅ Supports clinical notes and threshold management
- ✅ Has simulation capabilities for testing

The system is **functional and complete** for a mini project, but would need security hardening and additional features for production use.







