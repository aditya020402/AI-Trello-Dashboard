# Taskboard - AI-Powered Project Management

A comprehensive kanban board application with GitLab integration and AI assistant capabilities via GitHub Copilot MCP Server.

## 🎯 Features

### Core Features

- **Kanban Boards** - Organize tasks into customizable columns
- **Workspaces** - Group multiple boards together
- **Drag & Drop** - Intuitive task management
- **Real-time Updates** - Changes sync instantly
- **Activity Tracking** - Full audit trail of changes

### GitLab Integration

- **Import Issues** - Sync GitLab issues directly into boards
- **Multi-Project Support** - Manage multiple GitLab projects in one workspace
- **Auto-Sync** - Refresh issues from GitLab any time
- **Beautiful Gradients** - Visual distinction for GitLab boards

### AI Assistant (MCP Server)

- **GitHub Copilot Integration** - Ask questions in natural language
- **Workspace Management** - List and manage workspaces via CLI
- **Board Navigation** - Query boards and columns
- **Task Management** - Create, edit, move tasks
- **Search** - Find tasks across all boards
- **CLI Access** - Use `gh copilot` commands for task management

## 📦 Project Structure

```
taskboard/
├── backend/                 # Node.js/Express API
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── middleware.js       # Authentication
│   ├── db.js              # Database connection
│   └── index.js           # Server entry point
│
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── context/       # React context
│   │   └── styles/        # CSS files
│   └── package.json
│
├── mcp-server/            # NEW: GitHub Copilot MCP Server
│   ├── server.js          # MCP server implementation
│   ├── package.json       # Dependencies
│   ├── .env.example       # Configuration template
│   └── docs/              # Documentation
│       ├── README.md          # Full API reference
│       ├── QUICKSTART.md      # Quick setup
│       ├── SETUP_GUIDE.md     # Detailed setup
│       ├── EXAMPLES.md        # Usage examples
│       └── DEPLOYMENT.md      # Production guide
│
└── docker-compose.yml     # Docker orchestration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- Docker & Docker Compose (optional)

### Backend Setup

```bash
cd backend
npm install
npm start
# Runs on http://localhost:3000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### MCP Server Setup (NEW!)

```bash
cd mcp-server
npm install
npm start
# Runs on stdio, ready for Copilot

# Configure in ~/.copilot/config.json (see COPILOT_INTEGRATION.md)
```

## 🤖 Using with GitHub Copilot

### Quick Integration

1. Start the MCP server: `cd mcp-server && npm start`

2. Edit `~/.copilot/config.json`:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "taskboard",
        "command": "node",
        "args": ["/full/path/to/taskboard/mcp-server/server.js"],
        "env": {
          "TASKBOARD_API_URL": "http://localhost:3000/api",
          "TASKBOARD_AUTH_TOKEN": "your_jwt_token"
        }
      }
    ]
  }
}
```

3. Get your JWT token from Application → Local Storage → `authToken`

4. Use in Copilot Chat (Ctrl+L):

```
@taskboard List all my workspaces
@taskboard Find cards about "database"
@taskboard Move card 5 to Done
```

For detailed setup: [mcp-server/COPILOT_INTEGRATION.md](./mcp-server/COPILOT_INTEGRATION.md)

## 📚 Documentation

### Core Documentation

- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Development guide

### MCP Server Documentation

- [mcp-server/README.md](./mcp-server/README.md) - Full API reference
- [mcp-server/QUICKSTART.md](./mcp-server/QUICKSTART.md) - 5-minute setup
- [mcp-server/SETUP_GUIDE.md](./mcp-server/SETUP_GUIDE.md) - Detailed installation
- [mcp-server/EXAMPLES.md](./mcp-server/EXAMPLES.md) - Real-world usage examples
- [mcp-server/DEPLOYMENT.md](./mcp-server/DEPLOYMENT.md) - Production deployment
- [mcp-server/COPILOT_INTEGRATION.md](./mcp-server/COPILOT_INTEGRATION.md) - Copilot setup

## 🎨 Available MCP Tools

### Query Tools

- `list_workspaces` - Get all user workspaces
- `list_boards` - Get boards in a workspace
- `list_lists` - Get columns in a board
- `list_cards` - Get cards in a column
- `search_cards` - Search cards by title/description
- `view_card` - Get detailed card info

### Modification Tools

- `create_card` - Create a new card
- `update_card_title` - Change card title
- `update_card_description` - Change card description
- `move_card` - Move card to different column

## 💬 Example Copilot Interactions

```bash
# List everything
@taskboard List all my workspaces
@taskboard Show boards in workspace 1
@taskboard What columns are in this board?

# Search and query
@taskboard Find all high-priority tasks
@taskboard Show me everything about "API redesign"
@taskboard What's currently in progress?

# Make changes
@taskboard Create a bug fix task in the backlog
@taskboard Move the authentication work to done
@taskboard Update the database migration description

# Complex workflows
@taskboard Mark all review tasks as done and create a deployment checklist
@taskboard Find all bugs and move them to urgent review
```

## 🔧 Configuration

### Backend (.env)

```env
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/taskboard
JWT_SECRET=your_secret_key
PORT=3000
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api
```

### MCP Server (.env)

```env
TASKBOARD_API_URL=http://localhost:3000/api
TASKBOARD_AUTH_TOKEN=your_jwt_token_here
```

## 🐳 Docker Deployment

```bash
docker-compose up -d
```

This starts:

- PostgreSQL database on port 5432
- Backend API on port 3000
- Frontend on port 5173
- MCP Server (connect via stdio)

## 🔐 Authentication

- Login with username/password on http://localhost:5173
- JWT tokens automatically managed in local storage
- Use token for MCP server authentication

## 📊 Database Schema

### Core Tables

- `users` - User accounts
- `workspaces` - Project workspaces
- `boards` - Kanban boards
- `lists` - Board columns
- `cards` - Tasks/issues

### GitLab Integration

- `user_gitlab_tokens` - Stored GitLab PAT tokens
- `gitlab_workspace_config` - GitLab project mappings
- `gitlab_issue_mapping` - Card to GitLab issue links

### Audit Trail

- `activity_logs` - All user actions logged

## 🚢 Deployment

### Development

```bash
npm run dev  # Frontend
npm start    # Backend
npm start    # MCP Server
```

### Production

See [mcp-server/DEPLOYMENT.md](./mcp-server/DEPLOYMENT.md) for:

- Docker deployment
- Kubernetes setup
- Systemd service configuration
- Environment configuration
- Monitoring & logging

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test locally
3. Submit pull request

## 📝 License

MIT - See LICENSE file

## 🆘 Support

### Common Issues

**MCP Server not connecting to Copilot?**

- Verify config.json syntax (use JSON validator)
- Use absolute path to server.js
- Restart VS Code

**Authentication errors?**

- Get fresh JWT token from local storage
- Verify `TASKBOARD_API_URL` is correct
- Check backend is running

**API errors from MCP?**

- Check backend is running on port 3000
- Verify network connectivity
- Check auth token hasn't expired

### More Help

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review [mcp-server/SETUP_GUIDE.md](./mcp-server/SETUP_GUIDE.md)
3. Check application logs: `tail -f /tmp/backend.log`

## 🎉 What's New

### MCP Server (Latest)

✨ GitHub Copilot integration for natural language task management

- List workspaces, boards, and tasks
- Ask Copilot to find work
- Use natural language to create and update tasks
- CLI access via `gh copilot`

### GitLab Integration

✨ Sync GitLab issues directly into your boards

- Import issues from any GitLab project
- Multi-project support in single workspace
- Auto-sync to get latest updates
- Beautiful gradient backgrounds

### Frontend Improvements

✨ Smooth UI with loading states
✨ Random gradient backgrounds for visual distinction
✨ Real-time sync button for boards

---

**Ready to get started?** Go to [mcp-server/QUICKSTART.md](./mcp-server/QUICKSTART.md)!
