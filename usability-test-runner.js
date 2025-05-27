/**
 * CrypTalk Usability Test Runner
 * 
 * This script simulates a user going through the main workflows of the application
 * and reports on the experience. It's designed to be a starting point for more
 * comprehensive usability testing.
 * 
 * Usage:
 * 1. Make sure CrypTalk frontend is running
 * 2. Run this script with Node.js
 */

const puppeteer = require('puppeteer');

// Configuration
const config = {
  appUrl: 'http://localhost:5175', // Change this to match your dev server port
  demoDID: 'did:key:z6Mkqgr8azLX7omHiisB8AWwrHcQwJ29HiKyYzP9cHb5z3cH', // Example DID
  headless: false, // Set to true for headless mode
  slowMo: 100, // Slow down operations to make them visible (in ms)
  viewportWidth: 1280,
  viewportHeight: 800,
};

// Test scenarios
const scenarios = [
  {
    name: 'Launch and check homepage',
    run: async (page) => {
      console.log('Navigating to homepage...');
      await page.goto(config.appUrl);
      
      // Check for login form
      const didInputExists = await page.evaluate(() => {
        return !!document.querySelector('input[placeholder*="did:key"]');
      });
      
      if (!didInputExists) {
        throw new Error('DID input field not found on login page');
      }
      
      console.log('✅ Login page loaded successfully');
      await page.screenshot({ path: './test-results/homepage.png' });
    }
  },
  {
    name: 'Try invalid DID format',
    run: async (page) => {
      console.log('Testing invalid DID format...');
      await page.type('input[placeholder*="did:key"]', 'invalid-did');
      
      // Find and click login button
      const loginButton = await page.$('button[type="submit"]');
      if (!loginButton) {
        throw new Error('Login button not found');
      }
      
      await loginButton.click();
      await page.waitForTimeout(1000); // Wait for error message
      
      // Check for error message
      const errorVisible = await page.evaluate(() => {
        return !!document.querySelector('*[role="alert"]');
      });
      
      if (!errorVisible) {
        throw new Error('Error message not displayed for invalid DID');
      }
      
      console.log('✅ Error handling for invalid DID works correctly');
      await page.screenshot({ path: './test-results/invalid-did.png' });
      
      // Clear input
      await page.evaluate(() => {
        document.querySelector('input[placeholder*="did:key"]').value = '';
      });
    }
  },
  {
    name: 'Use Demo DID',
    run: async (page) => {
      console.log('Testing Demo DID button...');
      
      // Find and click Demo DID button
      const demoButton = await page.$('button:has-text("Demo DID")');
      if (!demoButton) {
        throw new Error('Demo DID button not found');
      }
      
      await demoButton.click();
      await page.waitForTimeout(500);
      
      // Check if DID input is filled
      const inputValue = await page.evaluate(() => {
        return document.querySelector('input[placeholder*="did:key"]').value;
      });
      
      if (!inputValue.startsWith('did:key:')) {
        throw new Error('Demo DID not populated in input field');
      }
      
      console.log('✅ Demo DID button works correctly');
      await page.screenshot({ path: './test-results/demo-did.png' });
    }
  },
  {
    name: 'Try login with Demo DID',
    run: async (page) => {
      console.log('Attempting login with Demo DID...');
      
      // Enable MCP integration
      const mcpCheckbox = await page.$('input[type="checkbox"]');
      if (mcpCheckbox) {
        await mcpCheckbox.click();
      }
      
      // Find and click login button
      const loginButton = await page.$('button[type="submit"]');
      await loginButton.click();
      
      try {
        // Wait for dashboard or error
        await page.waitForNavigation({ timeout: 5000 });
        
        // Check if redirected to dashboard
        const url = page.url();
        if (url.includes('/dashboard')) {
          console.log('✅ Login successful, redirected to dashboard');
          await page.screenshot({ path: './test-results/dashboard.png' });
          
          // Check Web3Storage status
          const statusElement = await page.$('text/Web3.Storage Status');
          if (!statusElement) {
            console.warn('⚠️ Web3Storage status component not found on dashboard');
          }
          
          // Check for MCP status if enabled
          const mcpElement = await page.$('text/MCP Status');
          if (!mcpElement) {
            console.warn('⚠️ MCP status component not found on dashboard');
          }
        } else {
          console.log('❌ Not redirected to dashboard after login attempt');
          await page.screenshot({ path: './test-results/login-failed.png' });
        }
      } catch (e) {
        console.log('❌ Login attempt failed, possibly due to invalid credentials');
        await page.screenshot({ path: './test-results/login-error.png' });
      }
    }
  }
];

// Main test runner
async function runTests() {
  console.log('====== CrypTalk Usability Test Runner ======');
  console.log(`Testing application at: ${config.appUrl}`);
  
  // Create directory for test results
  const fs = require('fs');
  if (!fs.existsSync('./test-results')) {
    fs.mkdirSync('./test-results');
  }
  
  // Launch browser
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
    headless: config.headless,
    slowMo: config.slowMo,
    defaultViewport: { 
      width: config.viewportWidth, 
      height: config.viewportHeight 
    }
  });
  
  const page = await browser.newPage();
  console.log('Browser launched successfully');
  
  // Run each scenario
  for (const scenario of scenarios) {
    console.log(`\n📋 Running scenario: ${scenario.name}`);
    try {
      await scenario.run(page);
    } catch (error) {
      console.error(`❌ Scenario failed: ${error.message}`);
      await page.screenshot({ path: `./test-results/${scenario.name.replace(/\s+/g, '-')}-error.png` });
    }
  }
  
  console.log('\n====== Test Run Complete ======');
  console.log('Screenshots saved to ./test-results directory');
  
  await browser.close();
}

// Check for Puppeteer
try {
  const hasPuppeteer = require.resolve('puppeteer');
} catch (e) {
  console.error('❌ Puppeteer not found. Please install it with:');
  console.error('npm install puppeteer');
  process.exit(1);
}

// Run the tests
runTests().catch(console.error);
