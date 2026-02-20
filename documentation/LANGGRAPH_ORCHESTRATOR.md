# LangGraph Agent Orchestrator System

## Overview

The chat system now uses **LangGraph** to orchestrate specialized AI agents that handle different types of user requests intelligently. The orchestrator automatically routes requests to the appropriate agent based on user intent.

## Architecture

```
User Request
     ↓
Router Agent (LangGraph)
     ↓
┌────────────────────────────────────────────────┐
│  Intent Classification                         │
│  - CREATE_TICKET                              │
│  - UPDATE_TICKET                              │
│  - SUMMARIZE_PRIORITIZE                       │
│  - KNOWLEDGE                                  │
│  - GENERAL_CHAT                               │
└────────────────────────────────────────────────┘
     ↓
┌─────────┬──────────┬────────────┬────────────┬──────────┐
│  Ticket │  Update  │ Summarize  │ Knowledge  │ General  │
│  Agent  │  Agent   │  Agent     │  Agent     │   Chat   │
│         │          │            │ (RAG)      │  Agent   │
└─────────┴──────────┴────────────┴────────────┴──────────┘
     ↓
  Response to User
```

## Specialized Agents

### 1. **Router Agent** (Orchestrator)

- **Purpose**: Classifies user intent and routes to the appropriate specialized agent
- **Technology**: GPT-3.5-turbo with intent classification prompt
- **Input**: User message, selected cards, workspace context
- **Output**: Intent classification (CREATE_TICKET, UPDATE_TICKET, etc.)

### 2. **Ticket Creation Agent**

- **Triggers**:
  - Keywords: "create", "new ticket", "new issue", "generate ticket", "add task"
  - Example: "Create a ticket to fix the login bug"
- **Output**: Structured ticket data with:
  - Title (concise, actionable)
  - Description (detailed with acceptance criteria)
  - Suggested list/status
  - Priority level (Low, Medium, High, Critical)

### 3. **Update Agent**

- **Triggers**:
  - Keywords: "update", "edit", "modify", "change", "revise", "improve", "fix ticket", "rewrite"
  - Requires: Single card selected
  - Example: "Update this ticket to include API documentation"
- **Output**: Suggested edits with:
  - Updated title
  - Updated description
  - Reasoning for changes

### 4. **Summarize/Prioritize Agent**

- **Triggers**:
  - Keywords: "summarize", "prioritize", "priority", "what should I work on", "which is important", "rank", "analyze themes", "common patterns"
  - Example: "Summarize these 5 tickets and suggest which to work on first"
- **Output**:
  - Summary of key themes
  - Priority recommendations
  - Actionable insights

### 5. **Knowledge Agent** (RAG-powered)

- **Triggers**:
  - Keywords: "how to", "what is", "explain", "documentation", "wiki", "architecture", "setup guide", "tell me about"
  - Example: "How do I set up the development environment?"
- **Features**:
  - Uses RAG (Retrieval Augmented Generation) when available
  - Searches indexed GitLab wikis, MRs, and issue comments
  - Provides source citations
  - Falls back to GPT-3.5 general knowledge if RAG unavailable
- **Output**:
  - Detailed answer
  - Source citations (with similarity scores and links)

### 6. **General Chat Agent**

- **Triggers**: Any request that doesn't match the above patterns
- **Purpose**: Handles general questions about selected cards
- **Example**: "What's the status of this ticket?"

## API Endpoints

### Primary Endpoint (New)

**POST** `/api/chat/orchestrate`

**Request Body:**

```json
{
  "message": "Create a ticket for user authentication",
  "selectedCards": [
    {
      "id": 123,
      "title": "Login Feature",
      "description": "Implement login form",
      "status": "In Progress"
    }
  ],
  "workspaceId": 456
}
```

**Response (Ticket Creation):**

```json
{
  "success": true,
  "intent": "CREATE_TICKET",
  "ticketData": {
    "title": "Implement User Authentication System",
    "description": "Create a secure authentication system with:\n- Email/password login\n- JWT tokens\n- Session management\n\nAcceptance Criteria:\n- Users can register and login\n- Passwords are hashed\n- Sessions expire after 24h",
    "suggestedList": "To Do",
    "priority": "High"
  }
}
```

**Response (Knowledge Query with RAG):**

```json
{
  "success": true,
  "intent": "KNOWLEDGE",
  "response": "The development environment requires Node.js 18+, PostgreSQL 15, and Docker. Here's how to set it up:\n\n1. Clone the repository\n2. Run `npm install` in both frontend and backend\n3. Start Docker containers with `docker-compose up`\n4. Run migrations with `npm run migrate`",
  "sources": [
    {
      "type": "wiki",
      "url": "https://gitlab.com/project/wikis/setup",
      "similarity": 0.92,
      "preview": "Development Setup Guide - Node.js 18+ required, PostgreSQL 15..."
    }
  ]
}
```

### Legacy Endpoints (Backwards Compatible)

All existing endpoints still work and route through the orchestrator:

- **POST** `/api/chat/card/:cardId` - Single card chat
- **POST** `/api/chat/multi-card` - Multiple cards chat
- **POST** `/api/chat/create-ticket` - Direct ticket creation
- **POST** `/api/chat/edit-ticket` - Direct ticket editing

## LangGraph Workflow

The system uses LangGraph's `StateGraph` to manage the agent workflow:

```javascript
// State structure
{
  messages: [],          // Conversation history
  intent: null,          // Classified intent
  context: null,         // Additional context
  result: null,          // Agent output
  ragConfigId: null,     // RAG configuration ID
  selectedCards: [],     // User-selected cards
  workspaceId: null      // Current workspace
}
```

**Graph Flow:**

1. **Entry Point**: Router Agent
2. **Conditional Routing**: Based on intent classification
3. **Specialized Agent**: Executes task
4. **End**: Returns result

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Dependencies

```json
{
  "@langchain/langgraph": "^latest",
  "@langchain/openai": "^latest",
  "@langchain/core": "^latest"
}
```

## Usage Examples

### Example 1: Create Ticket

**User Input:**

> "Generate a new ticket for implementing dark mode in the UI"

**Agent Flow:**

1. Router → Classifies as `CREATE_TICKET`
2. Ticket Agent → Generates structured ticket
3. Response → Ticket suggestion with title, description, priority

### Example 2: Summarize Multiple Tickets

**User Input (with 5 cards selected):**

> "Summarize these tickets and tell me which ones are highest priority"

**Agent Flow:**

1. Router → Classifies as `SUMMARIZE_PRIORITIZE`
2. Summarize Agent → Analyzes all 5 tickets
3. Response → Summary with priority recommendations

### Example 3: Knowledge Query (RAG)

**User Input:**

> "How do I run the database migrations?"

**Agent Flow:**

1. Router → Classifies as `KNOWLEDGE`
2. Knowledge Agent → Searches RAG knowledge base
3. RAG Service → Finds relevant wiki pages and MR comments
4. GPT → Generates answer from context
5. Response → Answer with source citations

### Example 4: Update Ticket

**User Input (1 card selected):**

> "Edit this ticket to add performance requirements"

**Agent Flow:**

1. Router → Classifies as `UPDATE_TICKET`
2. Update Agent → Analyzes current ticket + request
3. Response → Suggested edits with reasoning

## Key Features

✅ **Intelligent Intent Classification** - Automatically routes to the right agent  
✅ **Specialized Agents** - Each agent is optimized for its specific task  
✅ **RAG Integration** - Knowledge agent uses project documentation  
✅ **Backwards Compatible** - Legacy endpoints still work  
✅ **Error Handling** - Graceful fallbacks and error messages  
✅ **Extensible** - Easy to add new agents or intents

## Implementation Files

- **Orchestrator**: `/backend/services/agentOrchestrator.js`
- **Router**: `/backend/routes/chat.js`
- **RAG Service**: `/backend/services/ragService.js`

## Testing the System

### Test Ticket Creation:

```bash
curl -X POST http://localhost:3000/api/chat/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a ticket for adding export functionality",
    "selectedCards": [],
    "workspaceId": 1
  }'
```

### Test Knowledge Query:

```bash
curl -X POST http://localhost:3000/api/chat/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I configure the GitLab integration?",
    "selectedCards": [],
    "workspaceId": 1
  }'
```

### Test Summarization:

```bash
curl -X POST http://localhost:3000/api/chat/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Prioritize these tasks",
    "selectedCards": [
      { "id": 1, "title": "Bug fix", "description": "Critical login issue" },
      { "id": 2, "title": "Feature", "description": "Add dark mode" }
    ],
    "workspaceId": 1
  }'
```

## Benefits

1. **Smarter Routing**: Intent is automatically detected, no manual agent selection
2. **Better Responses**: Each agent is specialized and optimized
3. **RAG Integration**: Knowledge queries use indexed documentation
4. **Scalable**: Easy to add new agents or capabilities
5. **Observable**: Clear logging of intent classification and agent routing

## Future Enhancements

- Add **Test Agent** for generating test cases
- Add **Bug Analysis Agent** for debugging assistance
- Add **Code Review Agent** for PR feedback
- Implement **Multi-step Workflows** (e.g., create ticket → assign → notify)
- Add **Agent Memory** for context across conversations
