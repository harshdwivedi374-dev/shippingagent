@echo off
echo ========================================
echo   Starting Agentic Shipping Frontend
echo ========================================
echo.

REM Navigate to frontend directory
cd frontend

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Start the frontend
echo Starting Next.js dev server on http://localhost:3000
echo Press Ctrl+C to stop
echo.
npm run dev
