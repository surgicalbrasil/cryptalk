/**
 * Test script for CrypTalk's MCP extension integration with Web3.Storage and Payment methods
 * 
 * This script creates a sample MCP server definition for a gist that can be used
 * to test the integration between Web3.Storage DID-based storage and the MCP extension.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('===== CrypTalk MCP Extension Integration Test =====');

// Get the user's DID
let userDid;
try {
    userDid = execSync('w3 whoami', { encoding: 'utf8' }).trim();
    console.log(`Using DID: ${userDid}`);
} catch (error) {
    console.error('Error: Unable to get DID. Make sure you are logged in to Web3.Storage.');
    console.error('Run "w3 login" or setup-w3up.ps1 first.');
    process.exit(1);
}

// Create a sample MCP server definition that uses the Web3.Storage DID
const mcpServerDefinition = [
    {
        "label": "CrypTalk Web3 Messaging Demo",
        "command": "node",
        "args": ["${workspaceFolder}/demo-messaging-server.js", userDid],
        "env": {
            "W3_DID": userDid,
            "CRYPTALK_MODE": "test"
        }
    },
    {
        "label": "CrypTalk Payment Methods Demo",
        "command": "node",
        "args": ["${workspaceFolder}/demo-payment-server.js", userDid],
        "env": {
            "W3_DID": userDid,
            "PAYMENT_MODE": "test"
        }
    }
];

// Create a demo messaging server script that simulates off-chain messaging
const demoMessagingServerScript = `
// Demo Messaging Server for CrypTalk integration test
const readline = require('readline');

// Get DID from command line arguments 
const userDid = process.argv[2] || 'unknown';

console.log('Starting CrypTalk Messaging Demo Server');
console.log('Using DID:', userDid);
console.log('This server simulates off-chain messaging functionality');
console.log('Type "exit" to quit');

// Create a chat interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'CrypTalk > '
});

// Simulate chat functionality
rl.prompt();

rl.on('line', (line) => {
    const input = line.trim();
    
    if (input === 'exit') {
        console.log('Shutting down demo server...');
        process.exit(0);
    }
    
    if (input.startsWith('send ')) {
        const message = input.substring(5);
        console.log('\\nSending encrypted message using DID:', userDid);
        console.log('Message content:', message);
        console.log('✅ Message sent successfully through Web3.Storage');
        console.log('');
    } else if (input === 'help') {
        console.log('\\nAvailable commands:');
        console.log('  send <message> - Send an encrypted message using Web3.Storage');
        console.log('  receive - Check for new messages');
        console.log('  exit - Quit the demo server');
        console.log('');
    } else if (input === 'receive') {
        console.log('\\nChecking for new messages...');
        setTimeout(() => {
            console.log('✅ Received 1 new message:');
            console.log('From: anonymous user');
            console.log('Content: "Hello, this is a test reply for CrypTalk"');
            console.log('');
        }, 1000);
    } else {
        console.log('\\nUnrecognized command. Type "help" for available commands');
    }
    
    rl.prompt();
}).on('close', () => {
    console.log('Demo server terminated');
    process.exit(0);
});
`;

// Create a demo payment server script that simulates payment methods
const demoPaymentServerScript = `
// Demo Payment Server for CrypTalk integration test
const readline = require('readline');

// Get DID from command line arguments 
const userDid = process.argv[2] || 'unknown';

console.log('Starting CrypTalk Payment Methods Demo Server');
console.log('Using DID:', userDid);
console.log('This server simulates cryptocurrency payment functionality');
console.log('Type "exit" to quit');

// Create a payment interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'CrypTalk Payment > '
});

// Sample wallet for demo
const wallet = {
    address: '0x' + userDid.substring(8, 16),
    balance: 5.0
};

// Simulate payment functionality
rl.prompt();

rl.on('line', (line) => {
    const input = line.trim();
    
    if (input === 'exit') {
        console.log('Shutting down payment server...');
        process.exit(0);
    }
    
    if (input.startsWith('send ')) {
        const params = input.substring(5).split(' ');
        if (params.length < 2) {
            console.log('\\nUsage: send <amount> <address>');
        } else {
            const amount = parseFloat(params[0]);
            const address = params[1];
            
            if (isNaN(amount) || amount <= 0) {
                console.log('\\nInvalid amount. Please provide a positive number.');
            } else if (amount > wallet.balance) {
                console.log('\\nInsufficient balance!');
                console.log('Current balance:', wallet.balance);
            } else {
                console.log('\\nProcessing payment...');
                setTimeout(() => {
                    wallet.balance -= amount;
                    console.log('✅ Payment of', amount, 'sent to', address);
                    console.log('New balance:', wallet.balance);
                    console.log('Transaction stored using Web3.Storage DID:', userDid);
                }, 2000);
            }
        }
    } else if (input === 'balance') {
        console.log('\\nWallet address:', wallet.address);
        console.log('Current balance:', wallet.balance);
    } else if (input === 'help') {
        console.log('\\nAvailable commands:');
        console.log('  send <amount> <address> - Send a payment to the specified address');
        console.log('  balance - Check current wallet balance');
        console.log('  exit - Quit the payment server');
    } else {
        console.log('\\nUnrecognized command. Type "help" for available commands');
    }
    
    rl.prompt();
}).on('close', () => {
    console.log('Payment server terminated');
    process.exit(0);
});
`;

// Save the MCP server definition to a file
const serverDefinitionPath = path.join(__dirname, 'cryptalk-mcp-definition.json');
fs.writeFileSync(serverDefinitionPath, JSON.stringify(mcpServerDefinition, null, 2));
console.log(`✅ Created MCP server definition at: ${serverDefinitionPath}`);

// Save the demo server scripts
const messagingServerPath = path.join(__dirname, 'demo-messaging-server.js');
fs.writeFileSync(messagingServerPath, demoMessagingServerScript);
console.log(`✅ Created demo messaging server at: ${messagingServerPath}`);

const paymentServerPath = path.join(__dirname, 'demo-payment-server.js');
fs.writeFileSync(paymentServerPath, demoPaymentServerScript);
console.log(`✅ Created demo payment server at: ${paymentServerPath}`);

// Create a simple Gist content example file
const gistContentPath = path.join(__dirname, 'cryptalk-mcp-gist-content.txt');
const gistContent = 
`Create a GitHub Gist with the following content:

${JSON.stringify(mcpServerDefinition, null, 2)}

Then copy the Gist URL and use it with the "Add Gist Source" command in VS Code
when running the extension in debug mode.`;

fs.writeFileSync(gistContentPath, gistContent);
console.log(`✅ Created Gist content example at: ${gistContentPath}`);

console.log('\n===== Test Instructions =====');
console.log('1. Create a GitHub Gist with the content from cryptalk-mcp-gist-content.txt');
console.log('   or use the content from cryptalk-mcp-definition.json');
console.log('2. Copy the URL of your GitHub Gist');
console.log('3. Run the VS Code extension in debug mode (F5)');
console.log('4. In the new VS Code window, run the "MCP Extension Sample: Add Gist Source" command');
console.log('5. Enter the GitHub Gist URL');
console.log('6. Test both the messaging and payment functionality through the MCP extension');
console.log('\n===== Test Complete =====');
