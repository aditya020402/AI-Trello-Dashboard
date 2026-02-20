# MCP Server - What's New & How to Use

## 🎉 What's New?

You can now use **GitHub Copilot** to manage your Taskboard tasks using natural language!

```
You: @taskboard List all my tasks about database
Copilot: Shows all cards in your boards containing "database"

You: @taskboard Move the authentication task to review
Copilot: Moves that card to the review column

You: @taskboard Create a new bug fix task in the backlog
Copilot: Creates a new card in your To Do list
```

## 📂 New Directory Structure

```
taskboard/
└── mcp-server/          ← NEW DIRECTORY
    ├── server.js        ← MCP Server implementation
    ├── package.json     ← Dependencies
    ├── .env.example     ← Configuration template
    └── docs/
        ├── README.md
        ├── QUICKSTART.md
        ├── SETUP_GUIDE.md
        ├── EXAMPLES.md
        └── DEPLOYMENT.md
```

## 🚀 Getting Started (5 Minutes)

### 1. Navigate to MCP Server

```bash
cd mcp-server
npm install
```

### 2. Get Your Auth Token

1. Go to http://localhost:5173 and log in
2. Open DevTools (F12) → Application → Local Storage
3. Copy the `authToken` value

### 3. Configure Environment

Edit `.env`:

```
TASKBOARD_API_URL=http://localhost:3000/api
TASKBOARD_AUTH_TOKEN=paste_your_token_here
```

### 4. Start the Server

```bash
npm start
```

Should see:

```
[MCP] Taskboard MCP Server running on stdio
```

### 5. Configure Copilot

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

### 6. Restart VS Code

Close completely and reopen (Cmd+Q on macOS)

### 7. Test It!

In VS Code Chat (Ctrl+L):

```
@taskboard List all workspaces
```

Done! 🎉

## 📋 Available Commands

Remember, these are all natural language - Copilot understands many variations:

### Viewing Information

```
@taskboard List all workspaces
@taskboard Show boards in the first workspace
@taskboard What columns are in board 1?
@taskboard List cards in the To Do column
@taskboard Find tasks about "database"
@taskboard What am I currently working on?
```

### Creating Tasks

```
@taskboard Create a new card "Fix login bug"
@taskboard Add "Review PR #123" to the review list
@taskboard Create a database migration task
```

### Updating Tasks

```
@taskboard Update card 5 description to "Fixed the issue"
@taskboard Change card 3 title to "New Name"
@taskboard Rename this task to something better
```

### Moving Tasks

```
@taskboard Move card 1 to Done
@taskboard Mark this as in progress
@taskboard Move the authentication task to review
```

## 🎯 Real-World Examples

### Daily Standup

```
@taskboard What's in my In Progress column?
@taskboard Show me all cards in review
@taskboard What got completed yesterday?
```

### Sprint Planning

```
@taskboard List all To Do items
@taskboard Find high priority work
@taskboard Show me tasks that are blocked
```

### Code Review

```
@taskboard Find all cards waiting for review
@taskboard Move card 5 to done
@taskboard Mark these 3 cards as complete
```

### Bug Triage

```
@taskboard Search for "bug"
@taskboard Create a new issue for critical bug
@taskboard Add details about the performance issue
```

## 🆘 Troubleshooting

### "Can't find MCP server" or "@taskboard not available"

**Solution 1: Check config syntax**

- Make sure `~/.copilot/config.json` is valid JSON
- Use a JSON validator online

**Solution 2: Use absolute path**

- `pwd` in the mcp-server directory to get full path
- Copy entire path including `/mcp-server/server.js`

**Solution 3: Restart VS Code**

- Close completely: Cmd+Q (macOS) or verify no processes
- Reopen VS Code

### "Authentication failed"

**Solutions:**

- Token may have expired - log out and back into http://localhost:5173
- Copy token again from Local Storage
- Update `.env` with new token

### "Cannot connect to API"

**Check:**

```bash
# Is backend running?
curl http://localhost:3000/health

# Should return:
# {"status":"OK","message":"Server is running"}

# If not running, start it:
cd backend
npm start
```

### MCP Server won't start

```bash
# Check .env is valid
cat .env

# Try running with error output
node server.js

# Check dependencies installed
npm install
npm start
```

## 🔗 Documentation

For more detailed information:

- **Quick Setup**: [mcp-server/QUICKSTART.md](../mcp-server/QUICKSTART.md)
- **Complete Setup**: [mcp-server/SETUP_GUIDE.md](../mcp-server/SETUP_GUIDE.md)
- **API Reference**: [mcp-server/README.md](../mcp-server/README.md)
- **Usage Examples**: [mcp-server/EXAMPLES.md](../mcp-server/EXAMPLES.md)
- **Production Guide**: [mcp-server/DEPLOYMENT.md](../mcp-server/DEPLOYMENT.md)
- **Copilot Integration**: [mcp-server/COPILOT_INTEGRATION.md](../mcp-server/COPILOT_INTEGRATION.md)

## ⚡ Pro Tips

### 1. Keep Both Running

In separate terminals:

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm run dev

# Terminal 3
cd mcp-server && npm start
```

### 2. Token Management

- Store token in `.env` (which is gitignored)
- Don't share or commit tokens
- Regenerate token after security concerns

### 3. Natural Language Variations

All these work:

```
"What's in my backlog?"
"Show me the todo column"
"List cards in the first list"
"Tell me what to do"
```

### 4. Combine Operations

```
"Find the database task and move it to done"
"Create a new bug and add this description"
```

### 5. Get Help from Copilot

```
"How do I use the taskboard MCP server?"
"What can I do with @taskboard?"
"Show me example commands"
```

## 💡 Use Cases

### Developers

- Quick task management without leaving editor
- Find what to work on next
- Update progress via CLI

### Project Managers

- Monitor task status via Copilot
- Create and assign work quickly
- Get real-time updates

### Teams

- Shared board visibility
- Ask Copilot about project status
- Automated task management

## 🔄 Existing Users - No Changes Needed

Don't want to use the MCP server? No problem!

- Web interface still works perfectly
- GitLab integration is unchanged
- Everything is backward compatible

## 📊 What Can't You Do via MCP Yet?

- Create new workspaces (use web UI)
- Delete workspaces (use web UI)
- GitLab import (use web UI)
- User management (use web UI)
- View images/attachments (viewing only, no upload)

These can be added in future versions!

## 🚀 Next Steps

1. ✅ Complete the 5-minute setup above
2. 📚 Read [QUICKSTART.md](../mcp-server/QUICKSTART.md) for detailed info
3. 🎯 Bookmark [EXAMPLES.md](../mcp-server/EXAMPLES.md) if needed
4. 💬 Start using in your VS Code chat!

---

**Questions?** Check the documentation files in `mcp-server/docs/`
