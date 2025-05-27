// filepath: c:\Users\beelink\CrypTalk\cryptalk-frontend\src\tests\manual\auth-test.md

# CrypTalk Authentication Test Guide

This guide provides manual test procedures for verifying the Web3.Storage DID authentication in CrypTalk.

## Prerequisites

1. Web3.Storage DID obtained through the `setup-w3up.ps1` script
2. CrypTalk frontend development server running

## Test Cases

### Test Case 1: Valid DID Authentication

#### Steps:
1. Start the CrypTalk application
2. Navigate to the login page
3. Enter your valid Web3.Storage DID (starting with `did:key:`)
4. Optionally check the "Enable MCP Integration" checkbox
5. Click "Log in with Web3.Storage"

#### Expected Result:
- User should be successfully authenticated
- Redirected to the Dashboard page
- Web3.Storage status should show as "Connected"
- User's DID should be visible in the status component

### Test Case 2: Invalid DID Format

#### Steps:
1. Start the CrypTalk application
2. Navigate to the login page
3. Enter an invalid DID (e.g., "invalid-did" or "did:incorrect:format")
4. Click "Log in with Web3.Storage"

#### Expected Result:
- Error message should be displayed: "Invalid DID format. DID should start with did:key:"
- User should remain on the login page

### Test Case 3: Demo DID

#### Steps:
1. Start the CrypTalk application
2. Navigate to the login page
3. Click "Use Demo DID" button
4. Click "Log in with Web3.Storage"

#### Expected Result:
- The demo DID should be populated in the input field
- User should be able to log in with this demo DID
- Success message should be shown
- User should be redirected to the Dashboard

### Test Case 4: Session Persistence

#### Steps:
1. Successfully log in with a valid DID
2. Navigate to different pages in the application
3. Refresh the browser

#### Expected Result:
- User should remain logged in after browser refresh
- No need to re-authenticate
- All authenticated functionality should continue to work

### Test Case 5: Logout

#### Steps:
1. Successfully log in with a valid DID
2. Click the logout button (usually in the header or settings)

#### Expected Result:
- User should be logged out
- Redirected to the login page
- Web3.Storage connection should be terminated
- On refresh, user should remain logged out

## Notes for Testing

- Ensure you have a strong internet connection during testing
- If using the MCP integration, verify that MCP status indicators show "Connected"
- Check browser console for any errors during the authentication process

## Reporting Issues

If you encounter issues during testing:
1. Note the exact steps to reproduce
2. Capture any error messages from the UI or console
3. Report the issue in the project's GitHub repository or to the development team
