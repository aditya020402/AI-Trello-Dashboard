# Taskboard MCP Server Setup

## Overview

This HTTP-based MCP (Model Context Protocol) server provides GitHub Copilot Chat with access to your Taskboard instance, allowing you to manage workspaces, boards, lists, and cards directly from Copilot.

## Installation

1. **Install dependencies**:

```bash
cd mcp-server
npm install
```

2. **Configure environment**:
   Create a `.env` file in the `mcp-server` directory:

```env
# Taskboard API Configuration
TASKBOARD_API_URL=http://localhost:3000/api
TASKBOARD_AUTH_TOKEN=your_auth_token_here
MCP_SERVER_PORT=3001
```

## Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The server will start on `http://localhost:3001`

## GitHub Copilot Chat Integration

The `.vscode/mcp.json` file configures the MCP server for GitHub Copilot Chat:

```json
{
  "mcpServers": {
    "taskboard": {
      "url": "http://localhost:3001",
      "env": {
        "TASKBOARD_API_URL": "http://localhost:3000/api",
        "TASKBOARD_AUTH_TOKEN": ""
      }
    }
  }
}
```

### Setting up Copilot Chat

1. Open VS Code
2. Go to Settings → Extensions → GitHub Copilot Chat
3. Configure the MCP servers pointing to your local `.vscode/mcp.json`
4. Ensure the MCP server is running (`npm start`)

## Available Tools

The MCP server exposes the following tools for Copilot Chat:

- **list_workspaces** - List all accessible workspaces
- **list_boards** - List boards in a workspace
- **list_lists** - List columns/lists in a board
- **list_cards** - List cards in a list
- **search_cards** - Search cards by title or description
- **view_card** - Get detailed card information
- **update_card_description** - Update a card's description
- **update_card_status** - Change a card's status
- **create_card** - Create a new card
- **delete_card** - Delete a card
- **get_activity** - Get user activity summary
- **query_rag** - Query the knowledge base using RAG

## API Endpoints

### Health Check

```
GET /health
```

### MCP Endpoints

```
POST /mcp/v1/initialize        - Initialize connection
POST /mcp/v1/tools/list         - List available tools
POST /mcp/v1/tools/call         - Call a specific tool
POST /mcp/v1/resources/list     - List resources
POST /mcp/v1/prompts/list       - List prompts
```

## Example Copilot Chat Requests

1. "List all my workspaces"
2. "Show me boards in workspace 1"
3. "Search for cards about authentication"
4. "Update card 42 with description: 'In progress'"
5. "Create a new card in list 3"
6. "Query the knowledge base about setup process"

## Troubleshooting

- **Connection refused**: Ensure the MCP server is running on port 3001
- **Authentication error**: Check that `TASKBOARD_AUTH_TOKEN` is valid
- **No tools available**: Verify the server is properly initialized and responding to requests
- **Port already in use**: Change `MCP_SERVER_PORT` in `.env` to use a different port
