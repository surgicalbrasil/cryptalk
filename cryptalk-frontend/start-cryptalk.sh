#!/bin/bash

echo "🚀 Starting CrypTalk Services..."

# Check if upload server is already running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "📤 Starting Upload Server..."
  node simple-upload-server.js &
  UPLOAD_PID=$!
  sleep 2
  
  # Check if server started successfully
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Upload server started on http://localhost:3001"
  else
    echo "❌ Failed to start upload server"
  fi
else
  echo "✅ Upload server already running"
fi

# Start Vite dev server
echo "🌐 Starting Frontend..."
npm run dev

# When frontend is stopped, also stop upload server
if [ ! -z "$UPLOAD_PID" ]; then
  echo "Stopping upload server..."
  kill $UPLOAD_PID 2>/dev/null
fi