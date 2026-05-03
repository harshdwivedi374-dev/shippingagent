# 🚀 Agentic Shipping Platform - Startup Guide

## ⚡ Fastest Way to Start (30 seconds)

### Windows Users:
**Just double-click:** `START-ALL.bat`

This automatically:
- ✅ Sets up Python environment
- ✅ Installs all dependencies
- ✅ Creates database with demo users
- ✅ Starts backend (port 8000)
- ✅ Starts frontend (port 3000)

Then open: **http://localhost:3000**

---

## 🔐 Demo Login Credentials

### Admin Account
```
Email:    admin@agenticshipping.com
Password: Admin1234
```

### Vendor Account
```
Email:    vendor@fastship.com
Password: Vendor1234
```

---

## 📋 What You Get

### Backend (FastAPI)
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health
- **Database**: SQLite (no server needed)
- **AI**: Google Gemini (already configured)

### Frontend (Next.js)
- **URL**: http://localhost:3000
- **Pages**: Dashboard, Shipments, Agents, Escalations, Tracking, Analytics
- **Auth**: Firebase + JWT tokens
- **UI**: Modern dark theme with charts

---

## 🎯 Key Features to Test

### 1. Dashboard
- Real-time shipment stats
- Carrier performance charts
- AI confidence metrics
- Pending escalations

### 2. Create Shipment
1. Go to **Shipments** page
2. Click **Create Shipment**
3. Fill in origin/destination
4. Agents automatically:
   - Check compliance
   - Get rate quotes
   - Select optimal carrier
   - Calculate carbon footprint

### 3. Human-in-the-Loop
- Shipments with 70-95% confidence escalate to humans
- You get 3 pre-calculated options (A, B, C)
- Select one to approve
- Agent executes your choice

### 4. Agent Chat
- Go to **Agents** page
- Ask questions like:
  - "What's the cheapest way to ship to Canada?"
  - "Show me green shipping options"
  - "Why was this shipment delayed?"
- Get real-time AI analysis

### 5. Exception Handling
- Agents detect delays, weather issues, customs holds
- Auto-generate customer notifications
- Propose re-routing solutions
- Calculate cost-benefit analysis

---

## 📁 Project Structure

```
tribraainers/
│
├── START-ALL.bat              ← Double-click to start everything
├── QUICK_START.md             ← This file
├── START_PROJECT.md           ← Detailed setup guide
│
├── app/                       ← Backend (Python/FastAPI)
│   ├── agents/                ← AI agents
│   │   ├── orchestrator.py    ← Main workflow
│   │   ├── router_agent.py    ← Carrier selection
│   │   ├── compliance_agent.py ← Customs validation
│   │   ├── negotiator_agent.py ← Rate negotiation
│   │   └── exception_agent.py  ← Self-healing
│   ├── api/v1/                ← REST endpoints
│   ├── core/                  ← Config, database, auth
│   ├── models/                ← Database models
│   └── main.py                ← FastAPI entry point
│
├── frontend/                  ← Frontend (Next.js/React)
│   ├── src/app/               ← Pages (App Router)
│   │   ├── (dashboard)/       ← Protected pages
│   │   │   ├── dashboard/
│   │   │   ├── shipments/
│   │   │   ├── agents/
│   │   │   ├── escalations/
│   │   │   ├── tracking/
│   │   │   └── analytics/
│   │   └── login/             ← Login page
│   ├── src/components/        ← React components
│   └── src/lib/               ← API client, utils
│
├── scripts/
│   └── seed_data.py           ← Creates demo users
│
├── .env                       ← Backend config
├── frontend/.env.local        ← Frontend config
├── requirements.txt           ← Python dependencies
└── shipping.db                ← SQLite database (auto-created)
```

---

## 🔧 Manual Setup (if automatic fails)

### Backend (Terminal 1)
```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed database
python scripts/seed_data.py

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Terminal 2)
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## 🐛 Troubleshooting

### Backend Issues

**"Python not found"**
- Install Python 3.10+ from python.org
- Make sure "Add to PATH" is checked during installation

**"Port 8000 already in use"**
```bash
netstat -ano | findstr :8000
# Kill the process or restart computer
```

**"Module not found"**
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Issues

**"Node not found"**
- Install Node.js 18+ from nodejs.org

**"Port 3000 already in use"**
- Next.js will automatically use 3001, 3002, etc.

**"Network Error" in browser**
- Make sure backend is running on port 8000
- Check `frontend/.env.local` has correct API URL

### Login Issues

**"Login failed"**
- Make sure backend is running
- Check database was seeded: `python scripts/seed_data.py`
- Try the demo account buttons on login page

---

## 📊 System Requirements

### Minimum
- **OS**: Windows 10/11, macOS, Linux
- **Python**: 3.10 or higher
- **Node.js**: 18 or higher
- **RAM**: 4GB
- **Disk**: 2GB free space

### Recommended
- **RAM**: 8GB+
- **CPU**: 4+ cores
- **SSD**: For faster database operations

---

## 🔒 Security Notes

- Demo accounts are for **testing only**
- In production:
  - Change `APP_SECRET_KEY` in `.env`
  - Use real Firebase service account
  - Enable HTTPS
  - Use PostgreSQL instead of SQLite
  - Add rate limiting
  - Enable CORS restrictions

---

## 📚 Documentation

- **Quick Start**: `QUICK_START.md` (this file)
- **Full Setup**: `START_PROJECT.md`
- **API Docs**: http://localhost:8000/docs
- **Firebase Setup**: `FIREBASE_SETUP.md`
- **Architecture**: `DOCUMENTATION.md`

---

## 🆘 Getting Help

1. **Check terminal output** for error messages
2. **Check browser console** (F12) for frontend errors
3. **Verify both servers are running** (2 terminal windows)
4. **Try restarting** both backend and frontend
5. **Delete shipping.db** and re-seed if database is corrupted

---

## ✅ Success Checklist

After starting, verify:

- [ ] Backend terminal shows: `Application startup complete`
- [ ] Frontend terminal shows: `Ready in X.Xs`
- [ ] http://localhost:8000/health returns JSON
- [ ] http://localhost:3000 loads login page
- [ ] Can login with demo account
- [ ] Dashboard shows without errors
- [ ] Can navigate between pages

---

## 🎓 Next Steps

1. **Explore the Dashboard** - See real-time stats
2. **Create a Test Shipment** - Watch agents work
3. **Try Agent Chat** - Ask shipping questions
4. **Review Escalations** - Make human decisions
5. **Check API Docs** - http://localhost:8000/docs
6. **Read Full Documentation** - `DOCUMENTATION.md`

---

## 🚀 Production Deployment

For production deployment:
1. Use PostgreSQL instead of SQLite
2. Add Redis for caching
3. Enable HTTPS
4. Set up proper Firebase project
5. Add monitoring (Sentry, Prometheus)
6. Use environment-specific configs
7. Enable rate limiting
8. Add backup strategy

See `DOCUMENTATION.md` for production setup guide.

---

**Ready to start? Double-click `START-ALL.bat` and you're good to go! 🎉**
