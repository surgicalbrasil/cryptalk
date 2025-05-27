/**
 * Utility functions to interact with MCP extension demo servers
 */

import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';

// Hold references to the servers
let messagingServer: ChildProcess | null = null;
let paymentServer: ChildProcess | null = null;

// DID for testing
const TEST_DID = 'did:key:z6Mkqgr8azLX7omHiisB8AWwrHcQwJ29HiKyYzP9cHb5z3cH';

/**
 * Start the messaging server
 */
export const startMessagingServer = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Path to the messaging server script
      const serverPath = '../mcp-extension-sample/demo-messaging-server.js';
      
      // Start the server
      messagingServer = spawn('node', [serverPath, TEST_DID]);
      
      // Handle server output
      messagingServer.stdout?.on('data', (data) => {
        console.log(`Messaging Server: ${data}`);
      });
      
      messagingServer.stderr?.on('data', (data) => {
        console.error(`Messaging Server Error: ${data}`);
      });
      
      // Resolve after a delay to give the server time to start
      setTimeout(() => {
        resolve(true);
      }, 1000);
    } catch (error) {
      console.error('Error starting messaging server:', error);
      resolve(false);
    }
  });
};

/**
 * Start the payment server
 */
export const startPaymentServer = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Path to the payment server script
      const serverPath = '../mcp-extension-sample/demo-payment-server.js';
      
      // Start the server
      paymentServer = spawn('node', [serverPath, TEST_DID]);
      
      // Handle server output
      paymentServer.stdout?.on('data', (data) => {
        console.log(`Payment Server: ${data}`);
      });
      
      paymentServer.stderr?.on('data', (data) => {
        console.error(`Payment Server Error: ${data}`);
      });
      
      // Resolve after a delay to give the server time to start
      setTimeout(() => {
        resolve(true);
      }, 1000);
    } catch (error) {
      console.error('Error starting payment server:', error);
      resolve(false);
    }
  });
};

/**
 * Stop the messaging server
 */
export const stopMessagingServer = () => {
  if (messagingServer) {
    messagingServer.kill();
    messagingServer = null;
  }
};

/**
 * Stop the payment server
 */
export const stopPaymentServer = () => {
  if (paymentServer) {
    paymentServer.kill();
    paymentServer = null;
  }
};

/**
 * Stop all servers
 */
export const stopAllServers = () => {
  stopMessagingServer();
  stopPaymentServer();
};
