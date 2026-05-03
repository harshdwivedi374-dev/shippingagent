@echo off
echo ========================================
echo   Agentic Shipping - Complete Setup
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [1/5] Creating virtual environment...
    python -m venv venv
    echo Done!
    echo.
) else (
    echo [1/5] Virtual environment already exists
    echo.
)

REM Activate virtual environment
echo [2/5] Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Install dependencies
echo [3/5] Installing Python dependencies...
pip install -q -r requirements.txt
echo Done!
echo.

REM Seed database if it doesn't exist
if not exist "shipping.db" (
    echo [4/5] Seeding database with demo users and carriers...
    python scripts/seed_data.py
    echo.
) else (
    echo [4/5] Database already exists (shipping.db)
    echo.
)

REM Start the backend
echo [5/5] Starting FastAPI server...
echo.
echo ========================================
echo   Backend running on:
echo   http://localhost:8000
echo   
echo   API Docs: http://localhost:8000/docs
echo   Health:   http://localhost:8000/health
echo ========================================
echo.
echo Press Ctrl+C to stop
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
