# Run all tests for CrypTalk Web3.Storage integration

Write-Host "===== CrypTalk Web3.Storage Integration Test Suite =====" -ForegroundColor Cyan
Write-Host ""

# Check Web3.Storage CLI setup
Write-Host "Step 1: Checking Web3.Storage CLI setup..." -ForegroundColor Yellow
if (Get-Command w3 -ErrorAction SilentlyContinue) {
    Write-Host "✅ w3cli is installed" -ForegroundColor Green
} else {
    Write-Host "❌ w3cli is not installed. Please run setup-w3up.ps1 first" -ForegroundColor Red
    exit 1
}

# Get user DID
Write-Host "Step 2: Getting your DID..." -ForegroundColor Yellow
try {
    $did = & w3 whoami
    if ($did) {
        Write-Host "✅ DID found: $did" -ForegroundColor Green
        $env:W3_DID = $did
    } else {
        Write-Host "❌ No DID found. Please run setup-w3up.ps1 first" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error getting DID. Please run setup-w3up.ps1 first" -ForegroundColor Red
    exit 1
}

# Run basic upload test
Write-Host "Step 3: Testing basic file upload..." -ForegroundColor Yellow
$testFile = Join-Path $PSScriptRoot "test-file.txt"
if (-not (Test-Path $testFile)) {
    "This is a test file for CrypTalk Web3.Storage integration - $(Get-Date)" | Out-File -FilePath $testFile
    Write-Host "Created test file: $testFile" -ForegroundColor Green
}

try {
    $uploadResult = & w3 up $testFile
    if ($uploadResult) {
        Write-Host "✅ File uploaded successfully" -ForegroundColor Green
        $uploadResult | Out-Host
    } else {
        Write-Host "❌ File upload failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error uploading file: $_" -ForegroundColor Red
}

# Test Node.js integration
Write-Host "Step 4: Testing Node.js integration..." -ForegroundColor Yellow
try {
    $result = node ./test-extension-web3.js
    Write-Host "✅ Node.js test completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Error running Node.js test: $_" -ForegroundColor Red
}

# Test contract deployment (skip if not needed)
Write-Host "Step 5: Testing contract deployment (skipped - run manually)" -ForegroundColor Yellow
Write-Host "To test contract deployment: node ./contracts/deploy-ipfs-contract.js" -ForegroundColor Gray

# Final instructions for VS Code extension test
Write-Host ""
Write-Host "===== VS Code Extension Testing =====" -ForegroundColor Cyan
Write-Host "1. Open VS Code and run your extension in debug mode (F5)" -ForegroundColor White
Write-Host "2. In the new VS Code window, run the MCP Extension Sample commands:" -ForegroundColor White
Write-Host "   - 'MCP Extension Sample: Add Gist Source'" -ForegroundColor White
Write-Host "   - Use your DID: $did" -ForegroundColor White
Write-Host "3. Test the chat functionality with Web3.Storage integration" -ForegroundColor White
Write-Host ""
Write-Host "Test suite completed!" -ForegroundColor Green
