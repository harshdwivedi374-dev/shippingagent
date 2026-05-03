@echo off
echo ========================================
echo   Starting Agentic Shipping Platform
echo ========================================
echo.
echo This will open 2 terminal windows:
echo   1. Backend (FastAPI on port 8000)
echo   2. Frontend (Next.js on port 3000)
echo.
echo Press any key to continue...
pause >nul

REM Start backend in new window
echo Starting backend...
start "Agentic Shipping - Backend" cmd /k setup-and-start.bat

REM Wait 5 seconds for backend to initialize
timeout /t 5 /nobreak >nul

REM Start frontend in new window
echo Starting frontend...
start "Agentic Shipping - Frontend" cmd /k start-frontend.bat

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Login with demo account:
echo   Email:    admin@agenticshipping.com
echo   Password: Admin1234
echo.
echo Close this window or press any key to exit...
pause >nul
