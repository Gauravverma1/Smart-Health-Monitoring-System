# 🚀 Quick Start Guide - Restart Your Servers

## **The Problem:**
Your frontend and backend stopped working. This usually means the servers aren't running.

## **Solution: Start Both Servers**

### **Step 1: Start Backend (Python FastAPI)**
Open a **new terminal** and run:
```bash
cd backend_py
python -m uvicorn app:app --port 8000 --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### **Step 2: Start Frontend (React)**
Open **another new terminal** and run:
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### **Step 3: Verify**
1. Open browser: `http://localhost:5173`
2. You should see the login page
3. If you see errors, check the browser console (F12)

---

## **Common Issues & Fixes**

### **Issue 1: Port Already in Use**
**Error:** `Address already in use`

**Fix:**
- Find and kill the process using port 8000 or 5173
- Or change the port in the command

### **Issue 2: Module Not Found**
**Error:** `ModuleNotFoundError` or `Cannot find module`

**Fix:**
```bash
# For backend
cd backend_py
pip install -r requirements.txt

# For frontend
cd frontend
npm install
```

### **Issue 3: Database Error**
**Error:** Database-related errors

**Fix:**
- The database will be created automatically
- If issues persist, delete `backend_py/smarthealth.db` and restart

---

## **Quick Commands Summary**

**Terminal 1 (Backend):**
```bash
cd D:\game\project3\backend_py
python -m uvicorn app:app --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd D:\game\project3\frontend
npm run dev
```

---

## **✅ Verification Checklist**

- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Can access http://localhost:5173
- [ ] Login page appears
- [ ] No errors in browser console (F12)
- [ ] No errors in terminal

---

**If you still have issues, check:**
1. Python version (should be 3.8+)
2. Node.js version (should be 16+)
3. All dependencies installed
4. No firewall blocking ports



