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
  // Logger interface for Magic SDK compatibility
  logger?: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  };
}

// Global logger interface for all contexts
declare global {
  interface Window {
    logger?: {
      log: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      error: (...args: any[]) => void;
      info: (...args: any[]) => void;
      debug: (...args: any[]) => void;
    };
  }
  
  var logger: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  } | undefined;
}
