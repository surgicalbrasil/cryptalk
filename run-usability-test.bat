@echo off
REM CrypTalk Usability Test Setup and Runner
echo ====== CrypTalk Usability Test Setup ======
echo.
echo This script will install Puppeteer and run the usability test.
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/
    goto :EOF
)

echo Installing Puppeteer...
cd /d "c:\Users\beelink\CrypTalk"
call npm install puppeteer

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install Puppeteer.
    goto :EOF
)

echo.
echo ====== Running CrypTalk Usability Tests ======
echo.
echo Make sure your CrypTalk development server is running before continuing.
echo.
pause

node usability-test-runner.js

echo.
echo Test execution completed.
echo Results can be found in the test-results directory.
echo.
pause
