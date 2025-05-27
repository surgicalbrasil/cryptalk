@echo off
echo ===================================
echo CrypTalk Frontend Fix Script
echo ===================================
echo This script will fix the white screen issue by downgrading dependencies

echo.
echo Creating backup of current package.json...
copy package.json package.json.backup
if %ERRORLEVEL% NEQ 0 (
    echo Failed to backup package.json
    goto error
)
echo Backup created: package.json.backup

echo.
echo Replacing package.json with compatible version...
copy package.json.compatible package.json
if %ERRORLEVEL% NEQ 0 (
    echo Failed to copy compatible package.json
    goto error
)

echo.
echo Cleaning node_modules...
if exist node_modules (
    rmdir /s /q node_modules
)

echo.
echo Installing compatible dependencies...
echo This may take a few minutes...
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo npm install failed
    goto error
)

echo.
echo ===================================
echo Fix completed successfully!
echo ===================================
echo.
echo To start the development server, run:
echo npm run dev
echo.
echo If you still experience issues, please check the WHITESREEN-FIX.md file
echo for more information and alternative solutions.
goto end

:error
echo.
echo ===================================
echo Error occurred during fix process
echo ===================================
echo Please check the error message above and try again.
exit /b 1

:end
exit /b 0
