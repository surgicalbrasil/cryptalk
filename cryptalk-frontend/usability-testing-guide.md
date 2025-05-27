# CrypTalk Frontend Usability Testing Guide

This guide explains how to test the usability of your CrypTalk frontend application using the provided testing tools.

## Available Testing Resources

1. **Usability Test Plan** (`src/tests/usability/usability-test-plan.md`)
   - Comprehensive test plan detailing all aspects to test
   - Includes test categories, procedures, expected results, and metrics

2. **Manual Testing Checklist** (`src/tests/manual/manual-testing-checklist.md`)
   - Step-by-step instructions for manually testing the application
   - Includes checkboxes to track progress through each test area

3. **Automated UI Test Placeholder** (`src/tests/automated/basic-ui-test.js`)
   - Placeholder for implementing automated tests with a framework like Jest or Cypress
   - Illustrates how automated tests would be structured

4. **Usability Test Runner** (`usability-test-runner.js`)
   - Puppeteer-based script that simulates user interactions
   - Automatically captures screenshots of the application during testing

## Getting Started with Testing

### Step 1: Start the Development Server

First, make sure your CrypTalk frontend development server is running:

```powershell
# Using PowerShell script
.\Start-CrypTalk.ps1

# OR using batch file
start-cryptalk-dev.bat
```

The server should start and display a URL (typically http://localhost:5173 or similar).

### Step 2: Choose a Testing Method

#### For Manual Testing

1. Open the Manual Testing Checklist:
   ```
   src/tests/manual/manual-testing-checklist.md
   ```

2. Follow the steps in the checklist, checking off items as you complete them.

3. Document any issues or observations in the Notes section at the end of the checklist.

#### For Automated Testing

1. Run the provided batch file to install dependencies and run the usability test:
   ```
   run-usability-test.bat
   ```

2. The script will:
   - Install Puppeteer (if not already installed)
   - Launch a browser and navigate to your application
   - Run through several key user flows
   - Take screenshots at important steps
   - Save results in the `test-results` directory

### Step 3: Review the Results

After completing your testing:

1. Review any issues found during manual testing
2. Check the screenshots captured by the automated tests
3. Document issues that need to be addressed
4. Prioritize fixes based on severity and impact on user experience

## Testing the Web3.Storage DID Authentication

To specifically test the DID authentication process:

1. Run the `setup-w3up.ps1` script to generate a real DID:
   ```powershell
   cd mcp-extension-sample\setup\windows
   .\setup-w3up.ps1
   ```

2. Copy the generated DID

3. Use this DID when testing the login functionality in your app

4. Verify that:
   - Authentication succeeds with the real DID
   - Web3.Storage status shows as connected
   - Storage space information is displayed correctly

## Testing MCP Integration

To test the Model Context Protocol integration:

1. During login, check the "Enable MCP Integration" checkbox
2. After logging in, verify the MCP status indicator shows "Connected"
3. Test any MCP-specific functionality, such as the message log

## Reporting Issues

When documenting issues found during testing, include:

1. **Issue title**: Brief description of the problem
2. **Steps to reproduce**: Exact steps to recreate the issue
3. **Expected behavior**: What should have happened
4. **Actual behavior**: What actually happened
5. **Screenshots**: If applicable
6. **Environment details**: Browser, OS, screen size, etc.

## Next Steps

After identifying usability issues:

1. Prioritize issues based on impact and difficulty to fix
2. Create tickets or tasks for each issue
3. Address high-priority issues first
4. Re-test after implementing fixes

Remember that usability testing is an iterative process. Regular testing and refinements will help ensure your CrypTalk frontend provides a smooth and intuitive user experience.
