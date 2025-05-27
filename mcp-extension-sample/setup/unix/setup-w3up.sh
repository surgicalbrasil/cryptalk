#!/bin/bash
# CrypTalk Web3.Storage DID Setup Script
# This script helps set up the w3cli tool and get your Web3.Storage DID

echo "===== CrypTalk Web3.Storage DID Setup ====="
echo "This script will help you install and set up Web3.Storage's w3cli tool"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ $NODE_MAJOR_VERSION -lt 16 ]; then
    echo "❌ Error: Node.js version $NODE_VERSION is not supported!"
    echo "Web3.Storage requires Node.js 16 or higher. Please upgrade your Node.js installation."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed!"
    echo "Please install npm (it usually comes with Node.js)"
    exit 1
fi

echo "✅ npm detected"

# Install w3cli globally
echo ""
echo "📦 Installing Web3.Storage CLI tool globally..."
npm install -g @web3-storage/w3cli

if [ $? -ne 0 ]; then
    echo "❌ Error installing w3cli. Please check error messages above."
    exit 1
fi

echo "✅ w3cli installed successfully!"
echo ""

# Help user create a DID
echo "===== Creating your Web3.Storage Account and DID ====="
echo "Follow the prompts to create your Web3.Storage account and get your DID."
echo ""
echo "You will need to provide an email address for verification."
echo ""
echo "Press Enter to continue..."
read

# Run the w3 account create command
w3 account create

echo ""
echo "===== Getting your DID ====="
echo "Your DID will appear below. Copy it for use in CrypTalk."
echo ""

# Display the DID
w3 did

echo ""
echo "===== Next Steps ====="
echo "1. Copy your DID (starting with 'did:key:') from above"
echo "2. Open VS Code with the CrypTalk extension"
echo "3. Press Ctrl+Shift+P and run 'CrypTalk: Configure Web3.Storage with DID'"
echo "4. Paste your DID when prompted"
echo "5. Test the connection with 'CrypTalk: Test Web3.Storage DID Connection'"
echo ""
echo "For more information, see docs/Web3StorageDIDGuide.md in the CrypTalk project"
echo ""
echo "✅ Setup script completed!"
