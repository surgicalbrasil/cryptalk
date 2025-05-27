#!/bin/bash
# Setup script for Web3.Storage DID with Storage Provider

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== CrypTalk Web3.Storage DID Setup Script ===${NC}"
echo "This script will help you set up a Web3.Storage DID with a storage provider"
echo "for use with the CrypTalk application."

# Check if w3cli is installed
if ! command -v w3 &> /dev/null; then
    echo -e "${YELLOW}w3cli is not installed. Installing now...${NC}"
    npm install -g @web3-storage/w3cli
else
    echo -e "${GREEN}✓ w3cli is already installed${NC}"
fi

# Check if user is logged in to w3
echo -e "\n${GREEN}Checking if you're already logged in to Web3.Storage...${NC}"
W3_DID=$(w3 did 2>/dev/null || echo "")

if [ -z "$W3_DID" ]; then
    echo -e "${YELLOW}You're not logged in. Let's create an account or log in.${NC}"
    echo "Follow the prompts to complete the login process."
    w3 account create || w3 login
else
    echo -e "${GREEN}✓ Already logged in as: ${W3_DID}${NC}"
fi

# Create a space if needed
echo -e "\n${GREEN}Checking for available spaces...${NC}"
SPACES=$(w3 space ls 2>/dev/null || echo "")

if [ -z "$SPACES" ]; then
    echo -e "${YELLOW}No spaces found. Creating a new space for CrypTalk...${NC}"
    w3 space create cryptalk-space
else
    echo -e "${GREEN}✓ You have existing spaces:${NC}"
    echo "$SPACES"
    echo ""
    read -p "Do you want to create a new space for CrypTalk? (y/n): " CREATE_NEW
    if [[ $CREATE_NEW == "y" || $CREATE_NEW == "Y" ]]; then
        w3 space create cryptalk-space
    fi
fi

# Set current space
echo -e "\n${GREEN}Available spaces:${NC}"
w3 space ls
echo ""
read -p "Enter the name of the space you want to use: " SPACE_NAME

if [ -n "$SPACE_NAME" ]; then
    w3 space use "$SPACE_NAME"
else
    echo -e "${RED}No space name provided. Using the current space.${NC}"
fi

# Register with a storage provider
echo -e "\n${GREEN}Checking if the space has a storage provider...${NC}"
SPACE_INFO=$(w3 space info)

if [[ $SPACE_INFO == *"No storage providers"* ]]; then
    echo -e "${YELLOW}This space doesn't have a storage provider. Let's register one...${NC}"
    w3 space register
else
    echo -e "${GREEN}✓ This space already has a storage provider${NC}"
fi

# Display DID for use with CrypTalk
echo -e "\n${GREEN}Your Web3.Storage DID for CrypTalk:${NC}"
W3_DID=$(w3 did)
echo -e "${YELLOW}$W3_DID${NC}"
echo -e "Use this DID in the CrypTalk extension setup."

# Run a test to verify the setup
echo -e "\n${GREEN}Running a quick test to verify your setup...${NC}"

# Create a temporary test file
TEST_FILE="/tmp/cryptalk-test-$(date +%s).txt"
echo "This is a test file for CrypTalk Web3.Storage integration" > "$TEST_FILE"

echo "Uploading test file to Web3.Storage..."
CID=$(w3 up "$TEST_FILE" 2>/dev/null || echo "ERROR")

if [[ $CID == "ERROR" ]]; then
    echo -e "${RED}Failed to upload test file. Something is wrong with your setup.${NC}"
    echo "Please run 'w3 space info' to check your space configuration"
else
    echo -e "${GREEN}✓ Test file uploaded successfully!${NC}"
    echo "CID: $CID"
fi

# Clean up
rm -f "$TEST_FILE"

echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo "You can now use your DID with CrypTalk and the e2e-test.js script."
echo "Example: node contracts/e2e-test.js $W3_DID"
