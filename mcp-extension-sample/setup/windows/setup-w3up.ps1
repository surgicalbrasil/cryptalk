# CrypTalk Web3.Storage DID Setup Script for PowerShell
# This script helps set up the w3cli tool and get your Web3.Storage DID

Write-Host "===== CrypTalk Web3.Storage DID Setup =====" -ForegroundColor Cyan
Write-Host "This script will help you install and set up Web3.Storage's w3cli tool"
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = & node -v
    if (-not $nodeVersion) {
        throw "Node not found"
    }
} catch {
    Write-Host "❌ Error: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    exit 1
}

# Check Node.js version
$versionString = $nodeVersion.Replace("v", "")
$versionParts = $versionString.Split(".")
$nodeMajorVersion = [int]$versionParts[0]

if ($nodeMajorVersion -lt 16) {
    Write-Host "❌ Error: Node.js version $versionString is not supported!" -ForegroundColor Red
    Write-Host "Web3.Storage requires Node.js 16 or higher. Please upgrade your Node.js installation."
    exit 1
}

Write-Host "✅ Node.js version $versionString detected" -ForegroundColor Green

# Check if npm is installed
try {
    $npmVersion = & npm -v
    if (-not $npmVersion) {
        throw "npm not found"
    }
} catch {
    Write-Host "❌ Error: npm is not installed!" -ForegroundColor Red
    Write-Host "Please install npm (it usually comes with Node.js)"
    exit 1
}

Write-Host "✅ npm detected" -ForegroundColor Green

# Install w3cli globally
Write-Host ""
Write-Host "📦 Installing Web3.Storage CLI tool globally..." -ForegroundColor Cyan
npm install -g @web3-storage/w3cli

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error installing w3cli. Please check error messages above." -ForegroundColor Red
    exit 1
}

Write-Host "✅ w3cli installed successfully!" -ForegroundColor Green
Write-Host ""

# Help user create a DID
Write-Host "===== Creating your Web3.Storage Account and DID =====" -ForegroundColor Cyan
Write-Host "Follow the prompts to create your Web3.Storage account and get your DID."
Write-Host ""
Write-Host "You will need to provide an email address for verification."
Write-Host ""
Write-Host "Press Enter to continue..." -ForegroundColor Yellow
$null = Read-Host

# Run the w3 account create command
w3 account create

Write-Host ""
Write-Host "===== Getting your DID =====" -ForegroundColor Cyan
Write-Host "Your DID will appear below. Copy it for use in CrypTalk."
Write-Host ""

# Display the DID
w3 did

Write-Host ""
Write-Host "===== Next Steps =====" -ForegroundColor Cyan
Write-Host "1. Copy your DID (starting with 'did:key:') from above" -ForegroundColor Yellow
Write-Host "2. Open VS Code with the CrypTalk extension" -ForegroundColor Yellow
Write-Host "3. Press Ctrl+Shift+P and run 'CrypTalk: Configure Web3.Storage with DID'" -ForegroundColor Yellow
Write-Host "4. Paste your DID when prompted" -ForegroundColor Yellow
Write-Host "5. Test the connection with 'CrypTalk: Test Web3.Storage DID Connection'" -ForegroundColor Yellow
Write-Host ""
Write-Host "For more information, see docs/Web3StorageDIDGuide.md in the CrypTalk project"
Write-Host ""
Write-Host "Setup script completed!" -ForegroundColor Green
