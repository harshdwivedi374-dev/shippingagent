# ⚡ Quick Start - 30 Seconds

## Option 1: Automatic (Recommended)

**Double-click this file:**
```
START-ALL.bat
```

This will:
1. ✅ Create Python virtual environment
2. ✅ Install all dependencies
3. ✅ Seed database with demo users
4. ✅ Start backend on port 8000
5. ✅ Start frontend on port 3000
6. ✅ Open 2 terminal windows

**Then:**
- Open browser: http://localhost:3000
- Login with: `admin@agenticshipping.com` / `Admin1234`

---

## Option 2: Manual (Step by Step)

### Terminal 1 - Backend
```bash
# Double-click this file:
setup-and-start.bat
```

### Terminal 2 - Frontend
```bash
# Double-click this file:
start-frontend.bat
```

---

## Demo Accounts

**Admin:**
- Email: `admin@agenticshipping.com`
- Password: `Admin1234`

**Vendor:**
- Email: `vendor@fastship.com`
- Password: `Vendor1234`

---

## URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## Troubleshooting

**Backend won't start?**
```bash
# Check Python is installed
python --version

# Should show Python 3.10 or higher
```

**Frontend won't start?**
```bash
# Check Node.js is installed
node --version

# Should show v18 or higher
```

**Port already in use?**
```bash
# Check what's using the port
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Kill the process or restart your computer
```

**Still having issues?**
- Read the full guide: `START_PROJECT.md`
- Check error messages in the terminal windows
- Make sure both terminals stay open

---

## What to Test

1. **Dashboard** - View stats and charts
2. **Create Shipment** - Go to Shipments → Create
3. **Agent Chat** - Go to Agents → Ask questions
4. **Escalations** - View pending human decisions
5. **Tracking** - Real-time shipment tracking

---

## Stop the Servers

- Close both terminal windows
- Or press `Ctrl+C` in each terminal

---

## Next Steps

- Read full documentation: `DOCUMENTATION.md`
- Explore API: http://localhost:8000/docs
- Check project structure: `START_PROJECT.md`
