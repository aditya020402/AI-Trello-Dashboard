# Quick Start Guide

Get the Taskboard MCP Server running in 5 minutes.

## 1. Clone or Navigate to MCP Server

```bash
cd mcp-server
```

## 2. Quick Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

## 3. Get Your Auth Token

While the Taskboard app is running:

1. Go to http://localhost:5173
2. Log in with your credentials
3. Open DevTools (F12) → Application → Local Storage
4. Copy the **authToken** value
5. Edit `.env` and paste it:

```bash
# Edit .env
TASKBOARD_AUTH_TOKEN=paste_your_token_here
```

## 4. Start the Server

```bash
npm start
```

You should see:

```
[MCP] Taskboard MCP Server running on stdio
```

## 5. Test with Copilot

In VS Code Chat (Ctrl+L):

```
@taskboard List all workspaces
```

## Configuration in Copilot

### VS Code

Add to `~/.copilot/config.json`:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "taskboard",
        "command": "node",
        "args": ["/Full/Path/To/taskboard/mcp-server/server.js"],
        "env": {
          "TASKBOARD_API_URL": "http://localhost:3000/api",
          "TASKBOARD_AUTH_TOKEN": "your_token_here"
        }
      }
    ]
  }
}
```

Replace `/Full/Path/To/` with your actual absolute path, e.g.:

- macOS: `/Users/darknight/Developer/taskboard/mcp-server/server.js`
- Linux: `/home/user/projects/taskboard/mcp-server/server.js`

Then restart VS Code.

## Try These Commands

```
# List everything
@taskboard List all workspaces
@taskboard Show boards in the first workspace
@taskboard List all columns in board 1

# Search
@taskboard Find cards about "database"

# Modify
@taskboard Change card 5 title to "New Title"
@taskboard Move card 3 to the Done list
@taskboard Update card 2 description to "Fixed the issue"

# Create
@taskboard Create a card "New Task" in list 1
```

## Troubleshooting

**Error: "Cannot find module"**

```bash
npm install
```

**Error: "Authentication failed"**

- Verify your token in `.env`
- Get a fresh token (log out and back in to Taskboard)
- Check `TASKBOARD_API_URL` matches your setup

**MCP not appearing in Copilot**

- Ensure config JSON is valid (use a JSON validator)
- Use absolute path, not relative
- Restart VS Code completely

## More Help

- Full setup: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- API Reference: [README.md](./README.md)

---

**Next**: Follow the [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed installation and integration instructions.
