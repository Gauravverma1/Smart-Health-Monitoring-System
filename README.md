# 🩺 Smart Health Monitoring & Patient Analytics Platform

A full-stack, real-time healthcare telemetry and patient monitoring web platform built with **Python FastAPI**, **React (TypeScript)**, **Vite**, and **SQLite**.

Features real-time vital sign tracking, AI risk level classification, predictive health forecasting, automated report generation, an interactive medical chatbot, and a role-based **Database Inspector** with password masking and multi-format exporting (HTML, CSV, JSON).

---

## ✨ Features

- 🏥 **Real-Time Vitals Tracking:** Live monitoring of Heart Rate (BPM), SpO2 (%), and Body Temperature (°C) with dynamic risk indicators (`LOW`, `MEDIUM`, `HIGH`).
- 🤖 **AI Risk Assessment & Health Assistant:** Integrated predictive AI logic for risk level classification and an interactive floating chatbot for health guidance.
- 📈 **Predictive Trends Forecasting:** Linear regression modeling to forecast future patient vitals over 1h to 24h horizons.
- 📄 **Automated Health Reports & Insights:** Generate detailed clinical summaries, patient notes, and downloadable health performance reports.
- 🛡️ **Role-Based Access Control (RBAC):**
  - **Patients:** View personal vitals telemetry, health trends, and AI chatbot assistance.
  - **Doctors / Admins:** Monitor all registered patients, set customized threshold alerts, and access the Database Inspector.
- 📊 **Advanced Database Inspector & Exporter:**
  - Standard & interactive CLI database viewer ([`view_database.py`](file:///d:/game/project3/view_database.py)) with ANSI color tables and password masking.
  - Auto-generated responsive HTML Admin Dashboard ([`user_accounts.html`](file:///d:/game/project3/user_accounts.html)) featuring search, role filtering, and theme toggle.
  - Embedded Live Database Inspector modal inside the React Web App for Doctor/Admin roles.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Recharts, Lucide React, Glassmorphism CSS Design System |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, SQLAlchemy ORM, SQLite, PyJWT |
| **Database** | SQLite (`smarthealth.db`) |
| **Utilities** | Python ANSI Terminal Exporter, Interactive HTML Report Generator |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.8+**
- **Node.js 16+** & `npm`

---

### 1️⃣ Installation

Clone the repository:
```bash
git clone https://github.com/Gauravverma1/smart-health-monitoring.git
cd smart-health-monitoring
```

Install backend dependencies:
```bash
cd backend_py
pip install -r requirements.txt
cd ..
```

Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

---

### 2️⃣ Running the Application

#### **Step 1: Start Backend (Python FastAPI)**
```bash
cd backend_py
python -m uvicorn app:app --port 8000 --reload
```
> Backend API running at `http://127.0.0.1:8000`

#### **Step 2: Start Frontend (React + Vite)**
Open a new terminal and run:
```bash
cd frontend
npm run dev
```
> Web Application running at `http://localhost:5173/`

---

### 3️⃣ Database Inspector & CLI Exporter

Run the advanced Database Viewer script from the root directory:
```bash
python view_database.py
```

**Options:**
```bash
python view_database.py --show-passwords   # Display unmasked passwords in terminal
python view_database.py --search john      # Search users by name, username, or email
python view_database.py --role doctor      # Filter by specific role
python view_database.py --json             # Export data as user_accounts.json
```
Running the script automatically generates [`user_accounts.txt`](file:///d:/game/project3/user_accounts.txt) and an interactive [`user_accounts.html`](file:///d:/game/project3/user_accounts.html) report.

---

## 🔑 Demo Login Credentials

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Doctor** | `doctor` | `doctor` | Full Access + Doctor Dashboard + Database Inspector |
| **Doctor** | `umer` | `umer` | Full Access + Doctor Dashboard + Database Inspector |
| **Patient** | `patient` | `patient` | Patient Vitals Dashboard + AI Chatbot |
| **Patient** | `gauravv18` | `gauravv18` | Patient Vitals Dashboard + AI Chatbot |

---

## 📡 API Reference Summary

- `POST /api/v1/auth/login` - User authentication & JWT issuance
- `POST /api/v1/auth/signup` - Account registration
- `GET /api/v1/vitals/{patientId}/latest` - Fetch latest vital readings
- `GET /api/v1/vitals/{patientId}/recent` - Fetch vital history telemetry
- `GET /api/v1/patients` - Fetch patient directory (Doctor restricted)
- `GET /api/admin/users` - Fetch database user directory (Doctor/Admin restricted)
- `GET /api/admin/stats` - Fetch database telemetry statistics (Doctor/Admin restricted)

---

## 📁 Repository Structure

```
project3/
├── backend_py/
│   ├── app.py                 # FastAPI Application & Endpoints
│   ├── smarthealth.db         # SQLite Database
│   └── requirements.txt       # Python Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # Dashboards, Inspector Modal, Chatbot
│   │   ├── App.tsx            # Main Application & Router
│   │   └── main.tsx           # React Entry Point
│   ├── package.json
│   └── vite.config.js
├── view_database.py           # CLI & HTML Database Inspector Exporter
├── README.md                  # Project Documentation
└── QUICK_START.md             # Server Start Guide
```

---

## 📜 License
Licensed under the [MIT License](LICENSE).
