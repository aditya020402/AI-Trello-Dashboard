# Integration with GitHub Copilot - Quick Reference

Fast setup for integrating Taskboard with GitHub Copilot CLI.

## 🚀 60-Second Setup

### Step 1: Get Your Auth Token (1 min)

1. Go to http://localhost:5173 and log in
2. Open DevTools (F12) → Application → Local Storage
3. Copy the `authToken` value
4. Edit `mcp-server/.env`:
   ```
   TASKBOARD_API_URL=http://localhost:3000/api
   TASKBOARD_AUTH_TOKEN=your_copied_token_here
   ```

### Step 2: Start the Server (30 sec)

```bash
cd mcp-server
npm install
npm start
```

Should output:

```
[MCP] Taskboard MCP Server running on stdio
```

### Step 3: Configure Copilot (30 sec)

Edit `~/.copilot/config.json`:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "taskboard",
        "command": "node",
        "args": ["/FULL/PATH/TO/taskboard/mcp-server/server.js"],
        "env": {
          "TASKBOARD_API_URL": "http://localhost:3000/api",
          "TASKBOARD_AUTH_TOKEN": "your_token_here"
        }
      }
    ]
  }
}
```

**⚠️ Important:** Replace `/FULL/PATH/TO/` with the absolute path (use `pwd` in mcp-server directory)

### Step 4: Restart Copilot

- VS Code: Restart the application (Cmd+Q then reopen)
- Terminal: Start new terminal session

### Step 5: Test It!

In VS Code Chat (Ctrl+L):

```
@taskboard List all workspaces
```

Done! 🎉

## Common Commands

```
@taskboard List all workspaces
@taskboard Show boards in workspace 1
@taskboard List columns in board 1
@taskboard Find cards about "database"
@taskboard Move card 5 to Done list
@taskboard Create a card "New task" in list 1
@taskboard Update card 3 description to "Fixed the issue"
```

## Troubleshooting

| Problem              | Solution                                                      |
| -------------------- | ------------------------------------------------------------- |
| "Auth failed"        | Get fresh token: log out/in on http://localhost:5173          |
| "Command not found"  | Use absolute path in config (copy full output of `pwd`)       |
| "MCP not available"  | Restart VS Code and ensure config JSON is valid               |
| "API not responding" | Check backend is running: `curl http://localhost:3000/health` |

## Full Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Detailed quick start
- [README.md](./README.md) - Full API reference
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions
- [EXAMPLES.md](./EXAMPLES.md) - Usage examples
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment

---

**Next:** Head to [SETUP_GUIDE.md](./SETUP_GUIDE.md) if you need help
