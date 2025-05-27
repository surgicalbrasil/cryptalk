#!/bin/bash

echo "🚀 Setting up Web3Storage space with CLI..."

# Get the space DID from .env.local
SPACE_DID=$(grep "VITE_W3S_SPACE_DID=" .env.local | cut -d'=' -f2)

if [ -z "$SPACE_DID" ]; then
    echo "❌ VITE_W3S_SPACE_DID not found in .env.local"
    exit 1
fi

echo "📦 Space DID: $SPACE_DID"

# Show current spaces
echo -e "\n📋 Current spaces:"
w3 space ls

# Create a new space if needed
echo -e "\n🆕 Creating new space 'cryptalk-production'..."
NEW_SPACE_DID=$(w3 space create cryptalk-production 2>/dev/null | grep -oE "did:key:[a-zA-Z0-9]+")

if [ ! -z "$NEW_SPACE_DID" ]; then
    echo "✅ New space created: $NEW_SPACE_DID"
    
    # Update .env.local
    sed -i "s|VITE_W3S_SPACE_DID=.*|VITE_W3S_SPACE_DID=$NEW_SPACE_DID|" .env.local
    echo "✅ Updated .env.local with new space DID"
    
    SPACE_DID=$NEW_SPACE_DID
else
    echo "ℹ️  Using existing space"
fi

# Add the space
echo -e "\n🔗 Adding space to agent..."
w3 space add $SPACE_DID

# Use the space
echo -e "\n🎯 Setting as current space..."
w3 space use $SPACE_DID

# Show proof
echo -e "\n🔐 Current proofs:"
w3 proof ls

# Create a delegation for the web app
echo -e "\n📝 Creating delegation for web app..."
AGENT_DID=$(w3 whoami --json | jq -r '.Agent')
echo "Agent DID: $AGENT_DID"

# Test upload
echo -e "\n🧪 Testing upload..."
echo "Test upload from CrypTalk setup" > test-cryptalk.txt
w3 up test-cryptalk.txt
rm test-cryptalk.txt

echo -e "\n✅ Setup complete!"
echo "Your Web3Storage space is ready for CrypTalk."
echo "Please restart the development server."