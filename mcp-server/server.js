const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
require('dotenv').config();

const app = express();
const PORT = process.env.MCP_SERVER_PORT || 3001;
const API_BASE_URL = process.env.TASKBOARD_API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.TASKBOARD_AUTH_TOKEN || '';

// --- Your Original Axios Instance ---
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// --- MCP Server Initialization ---
const server = new Server(
  { name: 'taskboard-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// --- Your Original Tool Definitions (MCP Schema) ---
const tools = [
  {
    name: 'list_workspaces',
    description: 'List all workspaces that the user has access to',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'list_boards',
    description: 'List all boards in a specific workspace',
    inputSchema: {
      type: 'object',
      properties: { workspace_id: { type: 'number', description: 'The ID of the workspace' } },
      required: ['workspace_id']
    }
  },
  {
    name: 'list_lists',
    description: 'List all columns/lists in a specific board',
    inputSchema: {
      type: 'object',
      properties: { board_id: { type: 'number', description: 'The ID of the board' } },
      required: ['board_id']
    }
  },
  {
    name: 'list_cards',
    description: 'List all cards/issues in a specific list',
    inputSchema: {
      type: 'object',
      properties: { list_id: { type: 'number', description: 'The ID of the list' } },
      required: ['list_id']
    }
  },
  {
    name: 'search_cards',
    description: 'Search for cards/issues across all accessible boards by title or description',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search term to find in card titles or descriptions' } },
      required: ['query']
    }
  },
  {
    name: 'view_card',
    description: 'Get detailed information about a specific card/issue',
    inputSchema: {
      type: 'object',
      properties: { card_id: { type: 'number', description: 'The ID of the card' } },
      required: ['card_id']
    }
  },
  {
    name: 'update_card_description',
    description: 'Update the description of a card/issue',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number', description: 'The ID of the card' },
        description: { type: 'string', description: 'The new description for the card' }
      },
      required: ['card_id', 'description']
    }
  },
  {
    name: 'move_card',
    description: 'Move a card to a different list/column',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number', description: 'The ID of the card to move' },
        list_id: { type: 'number', description: 'The ID of the destination list' }
      },
      required: ['card_id', 'list_id']
    }
  },
  {
    name: 'update_card_title',
    description: 'Update the title of a card/issue',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number', description: 'The ID of the card' },
        title: { type: 'string', description: 'The new title for the card' }
      },
      required: ['card_id', 'title']
    }
  },
  {
    name: 'create_card',
    description: 'Create a new card/issue in a specific list',
    inputSchema: {
      type: 'object',
      properties: {
        list_id: { type: 'number', description: 'The ID of the list to add the card to' },
        title: { type: 'string', description: 'The title of the new card' },
        description: { type: 'string', description: 'The description of the new card (optional)' }
      },
      required: ['list_id', 'title']
    }
  }
];

// --- MCP Request Handlers (Preserving your exact API logic) ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let data;
    switch (name) {
      case 'list_workspaces':
        const wsRes = await apiClient.get('/workspaces');
        data = wsRes.data.map(ws => ({ id: ws.id, name: ws.name, description: ws.description, created_at: ws.created_at }));
        break;
      case 'list_boards':
        const boardRes = await apiClient.get('/boards', { params: { workspaceId: args.workspace_id } });
        data = boardRes.data.map(board => ({ id: board.id, title: board.title, workspace_id: board.workspace_id, created_at: board.created_at }));
        break;
      case 'list_lists':
        const listRes = await apiClient.get(`/lists?boardId=${args.board_id}`);
        data = listRes.data.map(list => ({ id: list.id, title: list.title, board_id: list.board_id, order_index: list.order_index }));
        break;
      case 'list_cards':
        const cardsRes = await apiClient.get(`/cards?listId=${args.list_id}`);
        data = cardsRes.data.map(card => ({ id: card.id, title: card.title, description: card.description, list_id: card.list_id, order_index: card.order_index }));
        break;
      case 'search_cards':
        const allCardsRes = await apiClient.get('/cards');
        data = allCardsRes.data
          .filter(card => card.title.toLowerCase().includes(args.query.toLowerCase()) || (card.description && card.description.toLowerCase().includes(args.query.toLowerCase())))
          .map(card => ({ id: card.id, title: card.title, description: card.description, list_id: card.list_id }));
        break;
      case 'view_card':
        const viewRes = await apiClient.get(`/cards/${args.card_id}`);
        data = viewRes.data;
        break;
      case 'update_card_description':
        const descRes = await apiClient.patch(`/cards/${args.card_id}`, { description: args.description });
        data = { success: true, card: descRes.data };
        break;
      case 'move_card':
        const moveRes = await apiClient.patch(`/cards/${args.card_id}`, { listId: args.list_id });
        data = { success: true, card: moveRes.data };
        break;
      case 'update_card_title':
        const titleRes = await apiClient.patch(`/cards/${args.card_id}`, { title: args.title });
        data = { success: true, card: titleRes.data };
        break;
      case 'create_card':
        const createRes = await apiClient.post('/cards', { listId: args.list_id, title: args.title, description: args.description || '' });
        data = { success: true, card: createRes.data };
        break;
      default:
        throw new Error(`Tool ${name} not found`);
    }

    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: error.response?.data?.message || error.message }]
    };
  }
});

// --- SSE Transport Layer ---

let transport;

app.use(cors());

app.get('/sse', (req, res) => {
  transport = new SSEServerTransport('/messages', res);
  server.connect(transport);
});

app.post('/messages', express.json(), async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(500).json({ error: 'SSE transport not initialized' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Taskboard MCP Server started on port ${PORT}`);
  console.log(`🔗 Connect VS Code to: http://localhost:${PORT}/sse`);
});