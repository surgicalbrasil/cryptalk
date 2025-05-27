# Simple W3Up setup test script
Write-Host "===== CrypTalk Web3.Storage DID Setup Test =====" -ForegroundColor Cyan

# Check if npm is installed
try {
    $npmVersion = & npm -v
    if (-not $npmVersion) {
        throw "npm not found"
    }
    Write-Host "✅ npm detected: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: npm is not installed!" -ForegroundColor Red
    exit 1
}

# Install w3cli globally if not already installed
Write-Host ""
Write-Host "📦 Installing Web3.Storage CLI tool globally..." -ForegroundColor Cyan
npm install -g @web3-storage/w3cli

Write-Host ""
Write-Host "===== Testing W3Up Connection =====" -ForegroundColor Cyan

# Try to get the DID if already logged in
Write-Host "Checking if already logged in..."
$didOutput = & w3 did 2>&1

# Display the current state
Write-Host ""
Write-Host "Current status:" -ForegroundColor Yellow
Write-Host $didOutput

Write-Host ""
Write-Host "Setup test completed!" -ForegroundColor Green
