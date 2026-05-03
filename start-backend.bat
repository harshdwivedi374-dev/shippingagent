@echo off
echo ========================================
echo   Starting Agentic Shipping Backend
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
echo.

REM Start the backend
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
