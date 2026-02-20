# MCP Server Setup Guide

Complete guide to set up and integrate the Taskboard MCP Server with GitHub Copilot.

## Prerequisites

- Node.js 16+ installed
- Taskboard application running locally
- GitHub Copilot CLI installed (for integration)

## Step 1: Install Dependencies

```bash
cd mcp-server
chmod +x setup.sh
./setup.sh
```

Or manually:

```bash
npm install
```

## Step 2: Get Your Authentication Token

The MCP server needs a valid JWT token to authenticate with the Taskboard API.

### Getting Your Auth Token

1. **Start the Taskboard Application**

   ```bash
   cd ..
   npm run dev
   # Opens http://localhost:5173
   ```

2. **Log In**
   - Visit http://localhost:5173 in your browser
   - Enter your credentials and log in

3. **Extract the Token**
   - Open Browser DevTools with `F12` or `Right-click > Inspect`
   - Go to the **Application** tab
   - In the left sidebar, find **Local Storage**
   - Click on `http://localhost:5173`
   - Look for a key named `authToken`
   - Copy its full value (it looks like a long string starting with `eyJ...`)

4. **Add Token to .env**

   ```bash
   cd mcp-server
   # If .env doesn't exist, copy from .env.example
   cp .env.example .env

   # Edit .env and add your token:
   # TASKBOARD_AUTH_TOKEN=your_copied_token_here
   ```

## Step 3: Start the MCP Server

```bash
npm start
```

You should see:

```
[MCP] Taskboard MCP Server running on stdio
```

The server is now ready to receive connections.

## Step 4: Configure GitHub Copilot

### Option A: VS Code Integration

1. **Install GitHub Copilot Extension**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Search for "GitHub Copilot"
   - Install the official extension

2. **Add Taskboard to Copilot Config**

   Create or edit `~/.copilot/config.json`:

   ```json
   {
     "mcp": {
       "servers": [
         {
           "name": "taskboard",
           "command": "node",
           "args": ["/path/to/taskboard/mcp-server/server.js"],
           "env": {
             "TASKBOARD_API_URL": "http://localhost:3000/api",
             "TASKBOARD_AUTH_TOKEN": "your_jwt_token_here"
           }
         }
       ]
     }
   }
   ```

   **Replace `/path/to/` with your actual path**, for example on macOS:

   ```json
   "args": ["/Users/darknight/Developer/taskboard/mcp-server/server.js"]
   ```

3. **Restart VS Code**

### Option B: macOS Terminal Integration

1. **Install GitHub CLI**

   ```bash
   brew install gh
   ```

2. **Install GitHub Copilot CLI**

   ```bash
   gh extension install github/gh-copilot
   ```

3. **Configure Copilot**

   ```bash
   gh copilot config
   ```

4. **Add MCP Server Configuration**

   Edit your Copilot configuration file and add:

   ```json
   {
     "mcp_servers": [
       {
         "name": "taskboard",
         "command": "node",
         "args": ["/path/to/taskboard/mcp-server/server.js"]
       }
     ]
   }
   ```

## Step 5: Test the Integration

### Using VS Code

In VS Code's Chat interface (Ctrl+L / Cmd+L), try:

```
@taskboard List all workspaces
```

You should see:

- The chat recognizes the `taskboard` MCP server
- It lists your workspaces in JSON format

### Using Terminal (macOS)

```bash
gh copilot explain "What boards are in my GitLab workspace?"
```

## Common Issues & Troubleshooting

### Issue: "Authentication failed" or "Error: Invalid token"

**Solution:**

- Token may have expired; get a fresh one by logging in again
- Ensure token is copied correctly without extra spaces
- Check that `TASKBOARD_API_URL` is correct and API is running

### Issue: "Command not found: node"

**Solution:**

- Verify Node.js is installed: `node --version`
- Use full path in config: `/usr/local/bin/node` or `/opt/homebrew/bin/node`
- Check with `which node` to find your Node installation

### Issue: MCP Server doesn't start

**Solution:**

- Check `.env` file exists and has valid config
- Run `npm install` to ensure dependencies are installed
- Test manually: `npm start` should show `[MCP] Taskboard MCP Server running on stdio`

### Issue: Can't find MCP server from Copilot

**Solution:**

- Verify Copilot config file syntax (JSON must be valid)
- Ensure the path to `server.js` is correct and absolute (not relative)
- Restart your editor/terminal after changing config
- Check file permissions: `chmod +x server.js`

## Available Commands

Once integrated with Copilot, you can use:

```bash
# Workspace Management
"List all my workspaces"
"Show workspace named 'GitLab'"

# Board Management
"Show boards in workspace 1"
"List all my boards"

# List/Column Management
"Show columns in board 5"
"List all lists"

# Card Management
"Search for cards with 'backend'"
"Show card 42 details"
"Move card 10 to Done list"
"Update card 15 description to 'New description'"
"Create a new card 'Bug: Login issue' in Todo list"

# Natural Language Examples
"Add a task to review the database schema in my backlog"
"Move the authentication work to in progress"
"Find all cards about documentation"
"Create a new issue for the API redesign"
```

## Production Deployment

### Docker Deployment

Create a `Dockerfile` in the mcp-server directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server.js .

ENV TASKBOARD_API_URL=http://api:3000/api
ENV TASKBOARD_AUTH_TOKEN=${TASKBOARD_AUTH_TOKEN}

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t taskboard-mcp .
docker run -e TASKBOARD_AUTH_TOKEN=your_token taskboard-mcp
```

## Architecture

```
┌─────────────────────────┐
│   GitHub Copilot CLI    │
└────────────┬────────────┘
             │ (MCP Protocol via stdio)
             │
┌────────────▼────────────┐
│  MCP Server (Node.js)   │
│  - List tools           │
│  - Process tool calls   │
└────────────┬────────────┘
             │ (HTTP REST API)
             │
┌────────────▼────────────┐
│  Taskboard Backend API  │
│  - http://localhost:3000/api
└────────────┬────────────┘
             │ (Database Query)
             │
┌────────────▼────────────┐
│   PostgreSQL Database   │
│   (workspaces, boards)  │
└─────────────────────────┘
```

## Security Notes

- **Never commit your auth token** to version control
- Use `.env` file (which is in `.gitignore`)
- Rotate your token periodically
- MCP server only runs locally, no data sent to external services

## Next Steps

1. ✅ Install and configure the MCP server
2. ✅ Test basic commands in Copilot
3. 💡 Experiment with natural language queries
4. 🚀 Integrate into your workflow

For more details, see [README.md](./README.md)
