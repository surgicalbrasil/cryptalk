# CrypTalk Frontend Fix Script
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "CrypTalk Frontend Fix Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "This script will fix the white screen issue by downgrading dependencies" -ForegroundColor Yellow

try {
    Write-Host "`nCreating backup of current package.json..." -ForegroundColor White
    Copy-Item -Path "package.json" -Destination "package.json.backup" -Force -ErrorAction Stop
    Write-Host "Backup created: package.json.backup" -ForegroundColor Green
    
    Write-Host "`nReplacing package.json with compatible version..." -ForegroundColor White
    Copy-Item -Path "package.json.compatible" -Destination "package.json" -Force -ErrorAction Stop
    
    Write-Host "`nCleaning node_modules..." -ForegroundColor White
    if (Test-Path -Path "node_modules") {
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction Stop
    }
    
    Write-Host "`nInstalling compatible dependencies..." -ForegroundColor White
    Write-Host "This may take a few minutes..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "`n===================================" -ForegroundColor Green
    Write-Host "Fix completed successfully!" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    
    Write-Host "`nTo start the development server, run:" -ForegroundColor Cyan
    Write-Host "npm run dev" -ForegroundColor White
    
    Write-Host "`nIf you still experience issues, please check the WHITESREEN-FIX.md file" -ForegroundColor Yellow
    Write-Host "for more information and alternative solutions." -ForegroundColor Yellow
}
catch {
    Write-Host "`n===================================" -ForegroundColor Red
    Write-Host "Error occurred during fix process" -ForegroundColor Red
    Write-Host "===================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
