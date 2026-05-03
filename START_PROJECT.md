# 🚀 Complete Project Startup Guide

## Prerequisites
- **Python 3.10+** installed
- **Node.js 18+** and npm installed
- **No Docker required** (using SQLite instead of PostgreSQL)

---

## 📦 Backend Setup (FastAPI)

### 1. Open Terminal #1 in project root (`C:\Users\flami\tribraainers`)

### 2. Create Python virtual environment (recommended)
```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 4. Verify .env file exists
The `.env` file is already configured with:
- SQLite database (no server needed)
- Google Gemini API key
- Firebase credentials
- All necessary settings

### 5. Start the backend server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected output:**
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Verify backend is running:**
- Open browser: http://localhost:8000/health
- Should see: `{"status": "healthy", "service": "AgenticShipping", ...}`

---

## 🎨 Frontend Setup (Next.js)

### 1. Open Terminal #2 in project root

### 2. Navigate to frontend folder
```bash
cd frontend
```

### 3. Install Node dependencies (if not already done)
```bash
npm install
```

### 4. Verify .env.local file
Check that `frontend/.env.local` has:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 5. Start the frontend dev server
```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

---

## 🎯 Access the Application

### 1. Open browser to: http://localhost:3000

### 2. You'll be redirected to: http://localhost:3000/login

### 3. Use Demo Accounts (scroll down on login page)
Click one of these buttons:

**Admin Account:**
- Email: `admin@agenticshipping.com`
- Password: `Admin1234`

**Vendor Account:**
- Email: `vendor@fastship.com`
- Password: `Vendor1234`

### 4. After login, you'll see the dashboard at: http://localhost:3000/dashboard

---

## 📊 Available Pages

Once logged in, navigate to:
- **Dashboard** - `/dashboard` - Overview with stats and charts
- **Shipments** - `/shipments` - Create and manage shipments
- **Agents** - `/agents` - Chat with AI agents
- **Escalations** - `/escalations` - Human-in-the-loop decisions
- **Tracking** - `/tracking` - Real-time shipment tracking
- **Analytics** - `/analytics` - Performance metrics
- **Sustainability** - `/sustainability` - Carbon footprint tracking

---

## 🔧 Troubleshooting

### Backend Issues

**Problem: `ModuleNotFoundError`**
```bash
# Make sure virtual environment is activated
venv\Scripts\activate
# Reinstall dependencies
pip install -r requirements.txt
```

**Problem: Port 8000 already in use**
```bash
# Check what's using port 8000
netstat -ano | findstr :8000
# Kill the process or use a different port
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
# Update frontend/.env.local to match new port
```

**Problem: Database errors**
```bash
# Delete the SQLite database and restart
rm shipping.db
# Backend will recreate it automatically on next start
```

### Frontend Issues

**Problem: `Network Error` or `401 Unauthorized`**
- Make sure backend is running on port 8000
- Check `frontend/.env.local` has correct API URL
- Try logging in with demo accounts again

**Problem: `npm run dev` fails**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Problem: Port 3000 already in use**
```bash
# Next.js will automatically try port 3001, 3002, etc.
# Or specify a port manually
npm run dev -- -p 3001
```

---

## 🧪 Testing the System

### 1. Create a Test Shipment

**Via API (http://localhost:8000/docs):**
1. Go to `/api/v1/auth/login` - Login with demo account
2. Copy the `access_token`
3. Click "Authorize" button (top right) - Paste token
4. Go to `/api/v1/shipments/` POST endpoint
5. Use this test payload:

```json
{
  "origin_address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  },
  "destination_address": {
    "street": "456 Market St",
    "city": "San Francisco",
    "state": "CA",
    "postal_code": "94102",
    "country": "US"
  },
  "weight_kg": 5.0,
  "dimensions_cm": {
    "length": 30,
    "width": 20,
    "height": 15
  },
  "declared_value_usd": 100.0,
  "service_level": "standard"
}
```

**Via Frontend:**
1. Go to http://localhost:3000/shipments
2. Click "Create Shipment" button
3. Fill in the form
4. Submit

### 2. Check Agent Processing
- The agents will automatically process the shipment
- Check the dashboard for updates
- If confidence is 70-95%, it will appear in Escalations

### 3. Test Escalations
- Go to http://localhost:3000/escalations
- You'll see shipments that need human review
- Each shows 3 options (A, B, C) calculated by agents
- Select one to approve

---

## 📝 Project Structure

```
tribraainers/
├── app/                          # Backend (FastAPI)
│   ├── agents/                   # AI agents
│   │   ├── orchestrator.py       # Main workflow
│   │   ├── router_agent.py       # Carrier selection
│   │   ├── compliance_agent.py   # Customs validation
│   │   ├── negotiator_agent.py   # Rate negotiation
│   │   └── exception_agent.py    # Self-healing
│   ├── api/v1/                   # REST endpoints
│   ├── core/                     # Config, database, auth
│   ├── models/                   # SQLAlchemy models
│   ├── services/                 # Business logic
│   └── main.py                   # FastAPI app entry
├── frontend/                     # Frontend (Next.js)
│   ├── src/app/                  # Pages (App Router)
│   ├── src/components/           # React components
│   └── src/lib/                  # API client, utils
├── .env                          # Backend environment
├── frontend/.env.local           # Frontend environment
├── requirements.txt              # Python dependencies
└── shipping.db                   # SQLite database (auto-created)
```

---

## 🎓 Key Features to Test

1. **Auto-Execution (≥95% confidence)**
   - Create a simple domestic shipment
   - Agents will execute automatically
   - Check dashboard for completed shipment

2. **Human-in-the-Loop (70-95% confidence)**
   - Create an international shipment
   - Lower confidence triggers escalation
   - Review 3 options in Escalations page

3. **Agent Chat**
   - Go to `/agents` page
   - Ask questions like "What's the cheapest way to ship to Canada?"
   - Agents respond with real-time analysis

4. **Exception Handling**
   - Simulated delays/weather issues
   - Exception agent proposes solutions
   - Auto-generates customer notifications

---

## 🔐 Security Notes

- Demo accounts are for testing only
- In production, change `APP_SECRET_KEY` in `.env`
- Add real Firebase service account for production auth
- Never commit `.env` files with real API keys

---

## 📚 Additional Resources

- **API Documentation**: http://localhost:8000/docs
- **Backend Health**: http://localhost:8000/health
- **Frontend**: http://localhost:3000
- **Firebase Setup**: See `FIREBASE_SETUP.md`
- **Full Documentation**: See `DOCUMENTATION.md`

---

## ✅ Success Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:8000/health
- [ ] Can access http://localhost:3000/login
- [ ] Can login with demo account
- [ ] Dashboard loads without errors
- [ ] Can create a test shipment
- [ ] Agents process shipment automatically

---

## 🆘 Still Having Issues?

1. **Check both terminals are running** (backend + frontend)
2. **Verify ports 8000 and 3000 are not blocked**
3. **Check browser console for errors** (F12)
4. **Check backend terminal for error logs**
5. **Try restarting both servers**

If problems persist, check the error messages in:
- Backend terminal (Python errors)
- Frontend terminal (Next.js errors)
- Browser console (Network/JavaScript errors)
