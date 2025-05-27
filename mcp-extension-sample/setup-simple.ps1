# Simple CrypTalk Web3.Storage DID Setup Script
Write-Host "Starting Web3.Storage setup..."

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "Node.js $nodeVersion found."
} catch {
    Write-Host "Error: Node.js is not installed!"
    exit 1
}

# Install w3cli if not present
try {
    $w3cliVersion = w3 --version
    Write-Host "w3cli already installed: $w3cliVersion"
} catch {
    Write-Host "Installing w3cli..."
    npm install -g @web3-storage/w3cli
}

Write-Host "Creating test file for upload..."
"This is a test file for Web3.Storage upload" | Out-File -FilePath ".\test-file.txt" -Encoding utf8

Write-Host "Setup completed successfully!"
Write-Host "Next steps:"
Write-Host "1. Run 'w3 login' to authenticate"
Write-Host "2. Use test-web3storage.js to test your connection"
