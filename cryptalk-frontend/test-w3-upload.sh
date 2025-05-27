#!/bin/bash

echo "🧪 Testing W3 Upload..."

# Create test file
echo "CrypTalk test upload at $(date)" > cryptalk-test.txt

# Upload with w3 CLI
echo "📤 Uploading with w3 CLI..."
w3 up cryptalk-test.txt

# Check status
echo -e "\n📊 Current space info:"
w3 space info

# Clean up
rm cryptalk-test.txt

echo -e "\n✅ If you see a CID above, the upload is working!"