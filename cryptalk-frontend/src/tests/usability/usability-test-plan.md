# CrypTalk Frontend Usability Test Plan

## Overview
This test plan outlines procedures for evaluating the usability of the CrypTalk frontend application, focusing on user experience, functionality, and integration with Web3.Storage DID authentication.

## Test Environment
- **Platform**: Windows
- **Browser**: Latest Chrome/Firefox/Edge
- **Server**: Local development server (http://localhost:5175)
- **Prerequisites**: Web3.Storage DID (obtained via setup-w3up.ps1)

## Test Categories

### 1. Installation & Setup

#### Test 1.1: Development Server Launch
- **Procedure**: Start the application using the provided scripts (Start-CrypTalk.ps1 or start-cryptalk-dev.bat)
- **Expected Result**: Server starts without errors, application accessible at http://localhost:5175 (or similar port)
- **Pass Criteria**: Development server launches successfully with no console errors

#### Test 1.2: Web3.Storage DID Setup
- **Procedure**: Run the setup-w3up.ps1 script to generate a DID
- **Expected Result**: Script guides user through the setup process and successfully generates a DID
- **Pass Criteria**: Valid DID obtained (format: did:key:...)

### 2. Authentication & User Management

#### Test 2.1: Login with Valid DID
- **Procedure**: Navigate to login page, enter valid DID, click login
- **Expected Result**: Successful authentication, redirect to dashboard
- **Pass Criteria**: User logged in, dashboard displayed, no error messages

#### Test 2.2: Login with Invalid DID
- **Procedure**: Navigate to login page, enter invalid DID format, click login
- **Expected Result**: Error message indicating invalid DID format
- **Pass Criteria**: Error message displayed, user remains on login page

#### Test 2.3: Login with Demo DID
- **Procedure**: Click "Use Demo DID" button, then login
- **Expected Result**: Demo DID populated in field, successful authentication
- **Pass Criteria**: User logged in with demo DID, redirect to dashboard

#### Test 2.4: Session Persistence
- **Procedure**: Login successfully, refresh browser
- **Expected Result**: User remains authenticated after page refresh
- **Pass Criteria**: No need to re-authenticate, dashboard remains accessible

#### Test 2.5: Logout Functionality
- **Procedure**: Click logout button after successful login
- **Expected Result**: User logged out, redirected to login page
- **Pass Criteria**: User cannot access protected routes after logout

### 3. Web3.Storage Integration

#### Test 3.1: Web3.Storage Connection Status
- **Procedure**: Login with valid DID, observe Web3.Storage status component
- **Expected Result**: Status shows "Connected" with green indicator
- **Pass Criteria**: Connection status displays correctly

#### Test 3.2: Storage Space Information
- **Procedure**: Check storage space information in Web3.Storage status component
- **Expected Result**: Space name and storage usage information displayed
- **Pass Criteria**: Storage information is visible and formatted correctly

#### Test 3.3: Web3.Storage Detailed View
- **Procedure**: Click the info button in Web3.Storage status component
- **Expected Result**: Modal opens with detailed storage information
- **Pass Criteria**: Modal displays DID, space details, and storage statistics

### 4. MCP Integration

#### Test 4.1: MCP Connection
- **Procedure**: Login with MCP integration enabled, observe MCP status
- **Expected Result**: MCP connection established, status shows "Connected"
- **Pass Criteria**: MCP status indicator shows connected state

#### Test 4.2: MCP Message Log
- **Procedure**: Navigate to MCPTestPanel or messaging section with MCP enabled
- **Expected Result**: Message log component displays MCP communications
- **Pass Criteria**: Real-time message log updates with MCP interactions

### 5. Core Functionality

#### Test 5.1: Navigation
- **Procedure**: Navigate between different sections of the application
- **Expected Result**: Smooth transition between pages, correct content loaded
- **Pass Criteria**: Navigation functions without errors or long delays

#### Test 5.2: Responsive Design
- **Procedure**: Test application at different viewport sizes
- **Expected Result**: UI adapts appropriately to different screen sizes
- **Pass Criteria**: No layout issues or overflow at common viewport dimensions

#### Test 5.3: Error Handling
- **Procedure**: Trigger potential error conditions (e.g., network disconnect)
- **Expected Result**: Graceful error handling with informative messages
- **Pass Criteria**: Errors caught and displayed without application crashing

## Usability Metrics

### Effectiveness
- **Task Completion Rate**: Percentage of tasks completed successfully
- **Error Rate**: Number of errors encountered during task completion

### Efficiency
- **Time on Task**: Time required to complete key tasks
- **Navigation Steps**: Number of clicks/steps to accomplish tasks

### Satisfaction
- **Difficulty Rating**: User rating of task difficulty (1-5 scale)
- **Satisfaction Score**: Overall satisfaction with the application (1-5 scale)

## Test Execution Checklist

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1.1 | Development Server Launch | | |
| 1.2 | Web3.Storage DID Setup | | |
| 2.1 | Login with Valid DID | | |
| 2.2 | Login with Invalid DID | | |
| 2.3 | Login with Demo DID | | |
| 2.4 | Session Persistence | | |
| 2.5 | Logout Functionality | | |
| 3.1 | Web3.Storage Connection Status | | |
| 3.2 | Storage Space Information | | |
| 3.3 | Web3.Storage Detailed View | | |
| 4.1 | MCP Connection | | |
| 4.2 | MCP Message Log | | |
| 5.1 | Navigation | | |
| 5.2 | Responsive Design | | |
| 5.3 | Error Handling | | |

## Notes
- For each test, document any usability issues encountered
- Include screenshots of key interactions and issues
- Measure time taken for critical tasks
- Document browser/device information for any environment-specific issues
