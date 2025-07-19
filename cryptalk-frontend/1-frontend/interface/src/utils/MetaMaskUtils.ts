// Utility functions for MetaMask integration

/**
 * Checks if MetaMask is installed in the browser
 * @returns boolean indicating if MetaMask is installed
 */
export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
};

/**
 * Checks if MetaMask is connected
 * @returns boolean indicating if MetaMask is connected
 */
export const isMetaMaskConnected = (): boolean => {
  return isMetaMaskInstalled() && !!window.ethereum?.selectedAddress;
};

/**
 * Requests connection to MetaMask
 * @returns Promise resolving to the connected address or null if connection failed
 */
export const connectToMetaMask = async (): Promise<string | null> => {
  if (!isMetaMaskInstalled()) {
    console.error('MetaMask not installed');
    return null;
  }
  
  try {
    const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' });
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
    return null;
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    return null;
  }
};

/**
 * Gets the current Ethereum network ID from MetaMask
 */
export const getNetworkId = async (): Promise<string | null> => {
  if (!isMetaMaskInstalled()) {
    return null;
  }
  
  try {
    return await window.ethereum!.request({ method: 'net_version' });
  } catch (error) {
    console.error('Error getting network ID:', error);
    return null;
  }
};

/**
 * Gets the current chain ID from MetaMask
 */
export const getChainId = async (): Promise<string | null> => {
  if (!isMetaMaskInstalled()) {
    return null;
  }
  
  try {
    return await window.ethereum!.request({ method: 'eth_chainId' });
  } catch (error) {
    console.error('Error getting chain ID:', error);
    return null;
  }
};

/**
 * Converts an Ethereum address to a DID in did:eth: format
 */
export const addressToDid = (address: string): string => {
  if (!address.startsWith('0x')) {
    throw new Error('Invalid Ethereum address format');
  }
  return `did:eth:${address}`;
};

/**
 * Extracts an Ethereum address from a DID in did:eth: format
 */
export const didToAddress = (did: string): string => {
  if (!did.startsWith('did:eth:')) {
    throw new Error('Invalid did:eth: format');
  }
  return did.substring(8);
};

export default {
  isMetaMaskInstalled,
  isMetaMaskConnected,
  connectToMetaMask,
  getNetworkId,
  getChainId,
  addressToDid,
  didToAddress
};
