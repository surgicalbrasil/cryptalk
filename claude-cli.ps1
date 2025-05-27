# Simple Claude CLI script
param (
    [string]$prompt,
    [string]$model = "claude-3-opus-20240229",
    [switch]$help
)

# Help section
if ($help) {
    Write-Host "Claude CLI - A simple command line interface for Claude AI"
    Write-Host "Usage:"
    Write-Host "  .\claude-cli.ps1 -prompt 'Your prompt here'"
    Write-Host "Options:"
    Write-Host "  -prompt    The prompt to send to Claude"
    Write-Host "  -model     The model to use (default: claude-3-opus-20240229)"
    Write-Host "  -help      Show this help message"
    exit
}

# Check if prompt is provided
if (-not $prompt) {
    Write-Host "Error: No prompt provided. Use -help for usage information."
    exit 1
}

# Create and execute a simple Python script that uses the Anthropic library
$pythonScript = @"
import os
import anthropic
import sys

# Get API key from environment variable
api_key = os.environ.get('ANTHROPIC_API_KEY')

if not api_key:
    print("Error: ANTHROPIC_API_KEY environment variable not set")
    print("Please set your API key with: \$env:ANTHROPIC_API_KEY = 'your-api-key'")
    sys.exit(1)

# Initialize the client
client = anthropic.Anthropic(api_key=api_key)

# Send the prompt to Claude
try:
    response = client.messages.create(
        model="$model",
        max_tokens=4096,
        messages=[
            {"role": "user", "content": "$prompt"}
        ]
    )
    
    # Print the response
    print(response.content[0].text)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
"@

# Write the Python script to a temporary file
$tempFile = New-TemporaryFile | Rename-Item -NewName { $_ -replace 'tmp$', 'py' } -PassThru

try {
    Set-Content -Path $tempFile.FullName -Value $pythonScript

    # Run the Python script
    python $tempFile.FullName
}
catch {
    Write-Host "Error: $_"
}
finally {
    # Clean up the temporary file
    if (Test-Path $tempFile.FullName) {
        Remove-Item $tempFile.FullName -Force
    }
}
