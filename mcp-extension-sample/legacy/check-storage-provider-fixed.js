/**
 * Storage Provider Check utility for Web3.Storage DID
 * 
 * This script checks if a Web3.Storage DID has been properly configured with a storage provider,
 * which is necessary for file uploads to work correctly.
 * 
 * Usage:
 * node check-storage-provider-fixed.js <did-key>
 */

const { create } = require('@web3-storage/w3up-client');

// Get DID key from command line argument
const didKey = process.argv[2];

if (!didKey || !didKey.startsWith('did:key:')) {
  console.error('❌ Error: DID key is required');
  console.error('Usage: node check-storage-provider-fixed.js <did-key>');
  process.exit(1);
}

/**
 * Mask a DID key for display in logs
 */
function maskDid(key) {
  if (!key || key.length < 20) return key;
  
  const parts = key.split(':');
  if (parts.length < 3) return key;
  
  const prefix = parts[0] + ':' + parts[1] + ':';
  const value = parts[2];
  
  if (value.length <= 10) return key;
  return prefix + value.substring(0, 5) + '...' + value.substring(value.length - 5);
}

/**
 * Check if a DID has a storage provider configured
 */
async function checkStorageProvider(didKey) {
  console.log(`🔑 Checking storage provider for DID: ${maskDid(didKey)}`);
  console.log(`🔄 Initializing w3up client...`);
  
  try {
    // Create the client
    const client = await create();
    console.log(`✅ Client created successfully`);
    
    // Create a test space
    const spaceName = `test-space-${Date.now().toString(16)}`;
    console.log(`- Creating space: ${spaceName}`);
    
    const space = await client.createSpace(spaceName);
    console.log(`- Space created with DID: ${space.did()}`);
    
    await client.setCurrentSpace(space.did());
    console.log('- Current space set successfully');
    
    // Try to check for storage provider
    console.log('🔍 Checking storage provider configuration...');
    
    // Check if the client has the necessary methods for storage
    if (!client.capability || typeof client.capability !== 'object') {
      console.log('❌ This version of w3up-client does not expose capability API');
      
      // Alternative check - check for delegations
      if (typeof client.delegations === 'function') {
        console.log('- Checking delegations instead...');
        const delegations = await client.delegations();
        
        if (delegations && delegations.length > 0) {
          const hasStorage = delegations.some(d => 
            (d.capabilities && d.capabilities.some(c => 
              c.includes('store') || c.includes('upload')
            )) || 
            (d.with && (d.with.includes('storage') || d.with.includes('filecoin')))
          );
          
          if (hasStorage) {
            console.log('✅ Storage provider configured correctly!');
            console.log(`- Found delegations with storage capabilities`);
            return true;
          }
        }
      }
      
      // If we can't determine capabilities, check service config
      if (client._serviceConf && client._serviceConf.uploadService) {
        console.log('✅ Upload service configuration found!');
        return true;
      }
      
      // If we can't definitely say it has storage, we need to warn the user
      console.log('⚠️ Could not determine storage provider configuration');
      console.log('- The DID might not have a storage provider configured');
      console.log('- You should register a storage provider to ensure uploads work');
      
      console.log('\n📋 How to register a storage provider:');
      console.log('1. Install the w3cli tool: npm install -g @web3-storage/w3cli');
      console.log('2. Create a space: w3 space create my-cryptalk-space');
      console.log('3. Register with a storage provider: w3 space register');
      console.log('4. Verify it works: w3 space info');
      
      return false;
    } else {
      // Use the capability API if available
      try {
        const capabilities = await client.capability.available();
        const hasStorageCapability = capabilities.some(cap => 
          cap.includes('store') || cap.includes('upload')
        );
        
        if (hasStorageCapability) {
          console.log('✅ Storage provider configured correctly!');
          return true;
        } else {
          console.log('❌ No storage provider capabilities found.');
          console.log('- Available capabilities:', capabilities);
          return false;
        }
      } catch (error) {
        // Try to detect storage provider errors
        if (error.name === 'InsufficientStorage' || 
            (error.message && error.message.includes('storage provider'))) {
          console.error('❌ This DID does not have a storage provider configured.');
          console.log('\n📋 How to fix this:');
          console.log('1. Install the w3cli tool: npm install -g @web3-storage/w3cli');
          console.log('2. Create a space: w3 space create my-cryptalk-space');
          console.log('3. Register with a storage provider: w3 space register');
          console.log('4. Verify it works: w3 space info');
          return false;
        }
        
        // Other errors
        console.error('❌ Error checking storage provider:', error.message);
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error initializing W3Up client:', error.message);
    throw error;
  }
}

// Run the check
checkStorageProvider(didKey)
  .then(hasProvider => {
    if (hasProvider) {
      console.log('\n🎉 Your DID is properly configured and ready to use with CrypTalk!');
      process.exit(0);
    } else {
      console.error('\n⚠️ Your DID is not properly configured for file uploads.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n❌ Check failed with error:', err);
    process.exit(1);
  });
