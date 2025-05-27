
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
            console.log('\nUsage: send <amount> <address>');
        } else {
            const amount = parseFloat(params[0]);
            const address = params[1];
            
            if (isNaN(amount) || amount <= 0) {
                console.log('\nInvalid amount. Please provide a positive number.');
            } else if (amount > wallet.balance) {
                console.log('\nInsufficient balance!');
                console.log('Current balance:', wallet.balance);
            } else {
                console.log('\nProcessing payment...');
                setTimeout(() => {
                    wallet.balance -= amount;
                    console.log('✅ Payment of', amount, 'sent to', address);
                    console.log('New balance:', wallet.balance);
                    console.log('Transaction stored using Web3.Storage DID:', userDid);
                }, 2000);
            }
        }
    } else if (input === 'balance') {
        console.log('\nWallet address:', wallet.address);
        console.log('Current balance:', wallet.balance);
    } else if (input === 'help') {
        console.log('\nAvailable commands:');
        console.log('  send <amount> <address> - Send a payment to the specified address');
        console.log('  balance - Check current wallet balance');
        console.log('  exit - Quit the payment server');
    } else {
        console.log('\nUnrecognized command. Type "help" for available commands');
    }
    
    rl.prompt();
}).on('close', () => {
    console.log('Payment server terminated');
    process.exit(0);
});
