# 🔧 Troubleshooting Guide

## **Issue 1: "Generate Predictions" Button Not Working**

### **Possible Causes:**
1. **Not enough data** - Need at least 5 readings
2. **Backend not running** - Server must be on port 8000
3. **Network error** - Check browser console (F12)

### **How to Fix:**

1. **Check if you have enough data:**
   - Click "Start Simulation" 
   - Wait for at least 5 readings (about 15-20 seconds)
   - Check the counter below the button

2. **Check if backend is running:**
   ```powershell
   # Terminal 1
   cd backend_py
   python -m uvicorn app:app --port 8000 --reload
   ```
   Should see: `INFO: Uvicorn running on http://127.0.0.1:8000`

3. **Check browser console (F12):**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Click "Generate Predictions"
   - Look for error messages
   - Should see: "Fetching predictions..." and "Response status: 200"

4. **Test the API directly:**
   - Open: `http://localhost:8000/api/v1/predict/YOUR_PATIENT_ID?hours=24`
   - Replace `YOUR_PATIENT_ID` with your actual patient ID
   - Should return JSON data (if you have 5+ readings)

---

## **Issue 2: "Not enough data for insights"**

### **Cause:**
Health Insights needs at least 2 readings within the selected time period (week/month).

### **How to Fix:**

1. **Start Simulation:**
   - Click "Start Simulation" button
   - Wait for at least 2-3 readings

2. **Check time period:**
   - Make sure readings are within the last week (or month)
   - If you just started, use "Week" view

3. **Wait for data:**
   - Simulation generates data every 3 seconds
   - Need at least 2 readings for insights
   - Need at least 5 readings for predictions

---

## **Quick Test Steps:**

1. ✅ **Backend running?**
   - Check: `http://localhost:8000/api/v1/admin/users`
   - Should show JSON (even if empty)

2. ✅ **Frontend running?**
   - Check: `http://localhost:5173`
   - Should show login page

3. ✅ **Logged in as patient?**
   - Login with patient account
   - Should see dashboard

4. ✅ **Simulation started?**
   - Click "Start Simulation"
   - Should see readings appearing

5. ✅ **Enough data?**
   - Wait 15-20 seconds
   - Should have 5+ readings
   - Check counter below "Generate Predictions" button

---

## **Common Errors:**

### **"Network error: Failed to connect"**
- **Fix:** Backend not running. Start it in Terminal 1.

### **"Need at least 5 readings"**
- **Fix:** Start simulation and wait 15-20 seconds.

### **"Not enough data for insights"**
- **Fix:** Wait for 2+ readings, check time period.

### **"403 Forbidden"**
- **Fix:** Make sure you're logged in and using correct patient ID.

### **"CORS error"**
- **Fix:** Backend CORS is configured. If still error, restart backend.

---

## **Debug Mode:**

Open browser console (F12) and look for:
- ✅ "Fetching predictions..." - Button clicked
- ✅ "Response status: 200" - API call successful
- ❌ Any red error messages - Copy and share

---

## **Still Not Working?**

1. **Check backend logs** - Look at terminal running backend
2. **Check frontend logs** - Browser console (F12)
3. **Verify patient ID** - Make sure it matches
4. **Restart both servers** - Sometimes helps

**Share the error message from browser console for specific help!**



