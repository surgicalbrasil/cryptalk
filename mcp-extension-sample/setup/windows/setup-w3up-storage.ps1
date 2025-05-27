# CrypTalk Web3.Storage DID Setup Script for Windows
# This script helps set up a Web3.Storage DID with a storage provider for the CrypTalk application

# Output colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Green($text) {
    Write-ColorOutput Green $text
}

function Write-Yellow($text) {
    Write-ColorOutput Yellow $text
}

function Write-Red($text) {
    Write-ColorOutput Red $text
}

Write-Green "=== CrypTalk Web3.Storage DID Setup Script ==="
Write-Host "This script will help you set up a Web3.Storage DID with a storage provider"
Write-Host "for use with the CrypTalk application."

# Check if w3cli is installed
$w3Installed = $false
try {
    $w3Version = npm list -g @web3-storage/w3cli 2>$null
    if ($w3Version -match "w3cli") {
        $w3Installed = $true
        Write-Green "✓ w3cli is already installed"
    }
}
catch {
    $w3Installed = $false
}

if (-not $w3Installed) {
    Write-Yellow "w3cli is not installed. Installing now..."
    npm install -g @web3-storage/w3cli
    if ($LASTEXITCODE -ne 0) {
        Write-Red "Failed to install w3cli. Please check npm installation and try again."
        exit 1
    }
    Write-Green "✓ w3cli installed successfully"
}

# Check if user is logged in to w3
Write-Green "`nChecking if you're already logged in to Web3.Storage..."
try {
    $w3Did = w3 did 2>$null
    if ($w3Did -and $w3Did -match "did:") {
        Write-Green "✓ Already logged in as: $w3Did"
    }
    else {
        Write-Yellow "You're not logged in. Let's create an account or log in."
        Write-Host "Follow the prompts to complete the login process."
        
        $loginChoice = Read-Host "Do you want to (1) create a new account or (2) login to existing? Enter 1 or 2"
        if ($loginChoice -eq "1") {
            w3 account create
        }
        else {
            w3 login
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Red "Login/account creation failed. Please try again manually."
            exit 1
        }
    }
}
catch {
    Write-Yellow "You're not logged in. Let's create an account or log in."
    w3 account create
    if ($LASTEXITCODE -ne 0) {
        Write-Red "Account creation failed. Please try again manually."
        exit 1
    }
}

# Create a space if needed
Write-Green "`nChecking for available spaces..."
try {
    $spaces = w3 space ls 2>$null
    if (-not $spaces -or $spaces -match "No spaces") {
        Write-Yellow "No spaces found. Creating a new space for CrypTalk..."
        w3 space create cryptalk-space
    }
    else {
        Write-Green "✓ You have existing spaces:"
        Write-Host $spaces
        
        $createNew = Read-Host "`nDo you want to create a new space for CrypTalk? (y/n)"
        if ($createNew -eq "y" -or $createNew -eq "Y") {
            w3 space create cryptalk-space
        }
    }
}
catch {
    Write-Yellow "Error checking spaces. Creating a new one..."
    w3 space create cryptalk-space
}

# Set current space
Write-Green "`nAvailable spaces:"
w3 space ls
$spaceName = Read-Host "`nEnter the name of the space you want to use"

if ($spaceName) {
    w3 space use $spaceName
}
else {
    Write-Red "No space name provided. Using the current space."
}

# Register with a storage provider
Write-Green "`nChecking if the space has a storage provider..."
$spaceInfo = w3 space info
if ($spaceInfo -match "No storage providers") {
    Write-Yellow "This space doesn't have a storage provider. Let's register one..."
    w3 space register
    if ($LASTEXITCODE -ne 0) {
        Write-Red "Failed to register with a storage provider. Please try again manually."
        Write-Host "Run 'w3 space register' to register your space with a storage provider."
        exit 1
    }
}
else {
    Write-Green "✓ This space already has a storage provider"
}

# Display DID for use with CrypTalk
Write-Green "`nYour Web3.Storage DID for CrypTalk:"
$w3Did = w3 did
Write-Yellow $w3Did
Write-Host "Use this DID in the CrypTalk extension setup."

# Run a test to verify the setup
Write-Green "`nRunning a quick test to verify your setup..."

# Create a temporary test file
$testFile = Join-Path $env:TEMP "cryptalk-test-$(Get-Date -Format 'yyyyMMddHHmmss').txt"
"This is a test file for CrypTalk Web3.Storage integration" | Out-File -FilePath $testFile

Write-Host "Uploading test file to Web3.Storage..."
try {
    $cid = w3 up $testFile
    if ($cid) {
        Write-Green "✓ Test file uploaded successfully!"
        Write-Host "CID: $cid"
    }
    else {
        Write-Red "Failed to upload test file. Something is wrong with your setup."
        Write-Host "Please run 'w3 space info' to check your space configuration"
    }
}
catch {
    Write-Red "Error uploading test file: $_"
    Write-Host "Please run 'w3 space info' to check your space configuration"
}

# Clean up
Remove-Item -Path $testFile -Force

Write-Green "`n=== Setup Complete ==="
Write-Host "You can now use your DID with CrypTalk and the e2e-test.js script."
Write-Host "Example: node contracts\e2e-test.js $w3Did"
