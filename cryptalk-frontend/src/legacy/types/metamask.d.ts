// MetaMask typings - Comprehensive typings for Ethereum window object
interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    selectedAddress?: string;
    isConnected?: () => boolean;
    enable?: () => Promise<string[]>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeAllListeners: (event: string) => void;
    request: (request: {
      method: string;
      params?: any[];
    }) => Promise<any>;
    sendAsync?: (request: { method: string; params?: any[] }, callback: (error: any, response: any) => void) => void;
    send?: (request: { method: string; params?: any[] }, callback: (error: any, response: any) => void) => void;
    autoRefreshOnNetworkChange?: boolean;
    chainId?: string;
    networkVersion?: string;
    _metamask?: {
      isUnlocked: () => Promise<boolean>;
    };
  };
}
