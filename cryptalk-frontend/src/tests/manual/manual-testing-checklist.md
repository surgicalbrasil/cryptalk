# CrypTalk Frontend Manual Testing Checklist

This checklist provides step-by-step instructions for manually testing the key features and usability aspects of the CrypTalk frontend application.

## Prerequisites
- [ ] Web3.Storage DID obtained (using setup-w3up.ps1)
- [ ] CrypTalk development server running
- [ ] Access to a modern web browser

## Login Flow

### Basic Login Functionality
- [ ] Navigate to http://localhost:5175 (or the port shown in your terminal)
- [ ] Verify login page loads with CrypTalk title
- [ ] Verify DID input field is present
- [ ] Verify "Enable MCP Integration" checkbox is present
- [ ] Verify "Log in with Web3.Storage" button is present
- [ ] Verify "Use Demo DID" button is present

### DID Validation
- [ ] Enter invalid text (e.g., "test") in the DID field and submit
- [ ] Verify appropriate error message is displayed
- [ ] Enter invalid DID format (e.g., "did:invalid:format") and submit
- [ ] Verify appropriate error message is displayed

### Demo DID
- [ ] Click "Use Demo DID" button
- [ ] Verify DID field is populated with a demo DID
- [ ] Attempt to login with the demo DID
- [ ] Note if authentication succeeds or fails (may depend on backend configuration)

### Valid DID Login
- [ ] Enter your valid Web3.Storage DID obtained from setup-w3up.ps1
- [ ] Check the "Enable MCP Integration" checkbox if you want to test that feature
- [ ] Click "Log in with Web3.Storage"
- [ ] Verify successful login and redirection to dashboard
- [ ] Note any loading indicators, delays, or visual feedback during authentication

## Dashboard Experience

### Dashboard Layout
- [ ] Verify dashboard loads with proper layout
- [ ] Check for header with navigation links
- [ ] Check for Web3.Storage status component
- [ ] Check for MCP status indicator (if MCP enabled)
- [ ] Verify main content area displays dashboard information

### Web3.Storage Status Component
- [ ] Check that Web3.Storage status shows "Connected"
- [ ] Check that your DID is displayed (truncated for display)
- [ ] Hover over DID to verify full DID appears in tooltip
- [ ] Click the info button to open detailed Web3.Storage information
- [ ] In the modal, verify:
  - [ ] Connection status is displayed
  - [ ] Space name is displayed
  - [ ] Storage usage statistics are visible
  - [ ] Complete DID is shown
- [ ] Close the modal

### Navigation
- [ ] Click on each navigation item in the header
- [ ] Verify proper page content loads for each section
- [ ] Check that current navigation item is highlighted/active
- [ ] Verify smooth transitions between pages with no errors

### Responsive Design
- [ ] Resize browser window to various widths (desktop, tablet, mobile)
- [ ] Verify layout adjusts appropriately
- [ ] Check that all elements remain functional and visible
- [ ] Test any mobile-specific navigation (hamburger menu, etc.)

## MCP Integration (if enabled)

### MCP Status
- [ ] Verify MCP status indicator shows "Connected"
- [ ] Navigate to any page using MCP features
- [ ] Check for the MCPMessageLog component
- [ ] Verify it displays any MCP communications
- [ ] Verify real-time updates when MCP events occur

## Logout Process

### Logout Functionality
- [ ] Locate and click the logout button
- [ ] Verify you are redirected to the login page
- [ ] Attempt to navigate to a protected route (e.g., /dashboard)
- [ ] Verify you are redirected back to the login page
- [ ] Check browser storage to confirm credentials are cleared

## Error Scenarios

### Network Issues
- [ ] Disconnect from network (disable WiFi/ethernet)
- [ ] Attempt to perform actions requiring network
- [ ] Verify appropriate error messages are displayed
- [ ] Reconnect to network and verify functionality recovers

### Invalid Operations
- [ ] Attempt operations with incorrect inputs
- [ ] Verify appropriate validation errors are displayed
- [ ] Verify application doesn't crash or show technical errors to users

## Performance Observations

### Loading Times
- [ ] Note initial application load time
- [ ] Note page transition times
- [ ] Note any operations that seem particularly slow

### Resource Usage
- [ ] Monitor browser resource usage during extended use
- [ ] Check for memory leaks (increasing memory use over time)
- [ ] Note any performance degradation during extended use

## General Usability Notes

### User Experience
- [ ] Note any confusing UI elements or workflows
- [ ] Identify places where additional feedback would be helpful
- [ ] Identify any accessibility issues (keyboard navigation, screen reader compatibility)

### Visual Design
- [ ] Check for consistent styling throughout the application
- [ ] Verify text is readable (contrast, size)
- [ ] Verify interactive elements are clearly distinguished
- [ ] Check for proper spacing and alignment of UI elements

## Notes and Observations

Use this space to document any issues, observations, or suggestions during testing:

1. 
2. 
3. 

## Test Environment Details

* Browser: 
* Operating System: 
* Screen Resolution: 
* Date of Testing: 
* Tester Name:
