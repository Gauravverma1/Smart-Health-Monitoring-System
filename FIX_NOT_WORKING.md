# 🔧 Fix: Frontend/Backend Not Working

## **Quick Fix - Start Both Servers**

### **Step 1: Open TWO Terminal Windows**

### **Terminal 1 - Start Backend:**
```powershell
cd D:\game\project3\backend_py
python -m uvicorn app:app --port 8000 --reload
```

**Wait for:** `INFO:     Uvicorn running on http://127.0.0.1:8000`

### **Terminal 2 - Start Frontend:**
```powershell
cd D:\game\project3\frontend
npm run dev
```

**Wait for:** `Local: http://localhost:5173/`

### **Step 3: Open Browser**
Go to: `http://localhost:5173`

---

## **If Still Not Working - Check These:**

### **1. Check Browser Console (F12)**
- Press F12 in browser
- Look at Console tab
- Copy any red error messages

### **2. Check Terminal Errors**
- Look at both terminal windows
- Copy any error messages

### **3. Common Issues:**

**"Cannot GET /" or "404"**
- Backend not running
- Fix: Start backend in Terminal 1

**"Failed to fetch" or CORS errors**
- Backend not running or wrong port
- Fix: Make sure backend is on port 8000

**"Module not found"**
- Dependencies not installed
- Fix: Run `npm install` in frontend folder

**"Port already in use"**
- Another process using the port
- Fix: Close other programs or change port

---

## **Quick Test:**

1. **Test Backend:** Open `http://localhost:8000/api/v1/admin/users` in browser
   - Should show JSON data (or empty array)
   - If error = backend not running

2. **Test Frontend:** Open `http://localhost:5173` in browser
   - Should show login page
   - If blank/error = frontend not running

---

## **Still Not Working?**

**Tell me:**
1. What error message you see (exact text)
2. In browser console (F12 → Console tab)
3. In terminal windows

Then I can help fix the specific issue!



