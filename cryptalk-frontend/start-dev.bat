@echo off
REM CrypTalk Development Starter Script for Windows

echo ======================================
echo   CrypTalk Development Environment
echo ======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Kill previous processes
echo Cleaning up previous processes...
taskkill /F /IM node.exe 2>nul

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Start Backend Upload Server
echo.
echo Starting Backend Upload Server...
start /B cmd /c "node simple-upload-server.js > upload-server.log 2>&1"
timeout /t 2 /nobreak >nul

REM Start Frontend Dev Server
echo Starting Frontend Dev Server...
start cmd /k "npm run dev"

echo.
echo ======================================
echo   CrypTalk is ready!
echo ======================================
echo.
echo URLs:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo.
echo Admin Access:
echo   Wallet: 0x650687aD5F50E2DF6763f300BCAC9E03B4B4fCb6
echo.
echo Press any key to stop all services...
pause >nul

REM Stop services
taskkill /F /IM node.exe 2>nul
echo.
echo Services stopped.
pause