#!/bin/bash

# Taskboard MCP Server Setup Script

echo "🚀 Setting up Taskboard MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js found: $(node --version)"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created. Please fill in your TASKBOARD_AUTH_TOKEN"
    echo ""
    echo "📚 To get your auth token:"
    echo "1. Start the Taskboard app (npm run dev in the root)"
    echo "2. Log in"
    echo "3. Open Browser DevTools (F12)"
    echo "4. Go to Application > Local Storage > http://localhost:5173"
    echo "5. Copy the 'authToken' value"
    echo "6. Paste it in the .env file as TASKBOARD_AUTH_TOKEN"
else
    echo "✓ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the MCP server, run:"
echo "  npm start"
echo ""
echo "For integration with GitHub Copilot, see README.md for configuration instructions."
