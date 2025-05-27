
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
        console.log('\nSending encrypted message using DID:', userDid);
        console.log('Message content:', message);
        console.log('✅ Message sent successfully through Web3.Storage');
        console.log('');
    } else if (input === 'help') {
        console.log('\nAvailable commands:');
        console.log('  send <message> - Send an encrypted message using Web3.Storage');
        console.log('  receive - Check for new messages');
        console.log('  exit - Quit the demo server');
        console.log('');
    } else if (input === 'receive') {
        console.log('\nChecking for new messages...');
        setTimeout(() => {
            console.log('✅ Received 1 new message:');
            console.log('From: anonymous user');
            console.log('Content: "Hello, this is a test reply for CrypTalk"');
            console.log('');
        }, 1000);
    } else {
        console.log('\nUnrecognized command. Type "help" for available commands');
    }
    
    rl.prompt();
}).on('close', () => {
    console.log('Demo server terminated');
    process.exit(0);
});
