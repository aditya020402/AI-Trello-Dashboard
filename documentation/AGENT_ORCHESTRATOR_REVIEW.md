# Agent Orchestrator - Pure AI Architecture Review

## Overview

The agent orchestrator has been refactored to be **pure AI-only** with no keyword-based fallbacks or error-handling workarounds.

---

## Architecture Flow

### Request Flow Diagram

```
Frontend (ChatWidget)
    ↓
    └─→ POST /chat/create-ticket
        POST /chat/edit-ticket
        POST /chat/card/:cardId
        POST /chat/multi-card
    ↓
Chat Routes (chat.js)
    ↓
    └─→ orchestrate() function
    ↓
Intent Classifier (AI-only)
    ↓
    ├─→ CREATE_TICKET? → ticketCreationAgent()
    ├─→ UPDATE_TICKET? → updateAgent()
    ├─→ SUMMARIZE_PRIORITIZE? → summarizePrioritizeAgent()
    ├─→ KNOWLEDGE? → knowledgeAgent()
    └─→ GENERAL_CHAT? → generalChatAgent()
    ↓
Agent Result { type, data/response/sources }
    ↓
Chat Route Transforms to Legacy Format
    ↓
Frontend Receives { success, response/ticketData }
    ↓
ChatWidget Parses and Displays
```

---

## Key Changes Made

### 1. **Removed All Keyword Fallbacks**

**BEFORE:**

```javascript
function classifyByKeywords(userMessage) {
  const msg = userMessage.toLowerCase();
  if (msg.match(/create|new ticket/)) return "CREATE_TICKET";
  // ... regex patterns
}
```

**AFTER:**

```javascript
// Pure AI-based intent classification
const intent = await classifyIntent(userMessage);
// No fallback function - AI handles 100% of classification
```

### 2. **Removed All Fallback Responses from Agents**

**BEFORE (Ticket Agent):**

```javascript
if (!llm) {
  return {
    type: "ticket_creation",
    data: {
      title:
        "New Ticket: " +
        state.messages[0]?.content?.split(" ").slice(0, 5).join(" "),
      // ... dummy data
    },
  };
}
```

**AFTER:**

```javascript
async function ticketCreationAgent(state) {
  const userRequest = state.messages[state.messages.length - 1]?.content || "";
  const systemPrompt = `You are a ticket creation specialist...`;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`Create ticket from: "${userRequest}"...`),
  ];

  const response = await llm.invoke(messages);
  const ticketData = JSON.parse(response.content.trim());
  return { type: "ticket_creation", data: ticketData };
}
// If llm fails, it throws error - no dummy data
```

### 3. **Proper Error Handling - Errors Thrown, Not Hidden**

**BEFORE:**

```javascript
try {
  // ...
} catch (err) {
  // Return dummy data silently
  return {
    type: "ticket_update",
    data: {
      /* fallback */
    },
  };
}
```

**AFTER:**

```javascript
// Validation errors thrown immediately
if (!targetCard) {
  throw new Error("Please select a single card to update");
}

// Agent execution - if AI fails, error propagates
const response = await llm.invoke(messages);
// No catch block - let error bubble up to route handler
```

### 4. **All 5 Agent Functions Converted to Pure AI**

| Agent               | Before                          | After                       |
| ------------------- | ------------------------------- | --------------------------- |
| **Ticket Creation** | Had fallback response           | Pure AI call                |
| **Update**          | Had fallback response           | Pure AI call                |
| **Summarize**       | Had fallback response           | Pure AI call                |
| **Knowledge**       | Had LLM fallback + RAG fallback | Pure AI (with optional RAG) |
| **General Chat**    | Had fallback response           | Pure AI call                |

### 5. **Intent Classification - AI-Only with Validation**

```javascript
async function classifyIntent(userMessage) {
  const systemPrompt = `... classify intent ...`;
  const response = await llm.invoke(messages);
  const intent = response.content.trim().toUpperCase();

  // Validation - must be valid, no keyword fallback
  const validIntents = ['CREATE_TICKET', 'UPDATE_TICKET', ...];
  if (!validIntents.includes(intent)) {
    throw new Error(`Invalid intent classification from AI: ${intent}`);
  }
  return intent;
}
```

---

## Agent Specifications

### 1. **Ticket Creation Agent**

- **Input:** User request + optional board context
- **Processing:** AI generates JSON with title, description, suggested list, priority
- **Output:** `{ type: 'ticket_creation', data: { title, description, suggestedList, priority } }`
- **Error:** Throws error if JSON parsing fails

### 2. **Update Agent**

- **Input:** Current card + user request
- **Validation:** Requires exactly 1 selected card
- **Processing:** AI suggests improvements to ticket
- **Output:** `{ type: 'ticket_update', data: { title, description, reasoning }, cardId }`
- **Error:** Throws if no card selected or JSON parsing fails

### 3. **Summarize/Prioritize Agent**

- **Input:** Multiple cards + user request
- **Validation:** Requires at least 1 card
- **Processing:** AI analyzes and prioritizes tickets
- **Output:** `{ type: 'analysis', response: 'analysis text' }`
- **Error:** Throws if no cards selected

### 4. **Knowledge Agent**

- **Input:** Question + optional RAG config
- **Processing:**
  - If RAG available: Query RAG knowledge base
  - If no RAG: Use general AI knowledge
- **Output:** `{ type: 'knowledge', response: 'answer', sources: [] }`
- **Error:** Throws if RAG query fails

### 5. **General Chat Agent**

- **Input:** Question + optional selected cards
- **Processing:** AI answers based on selected cards context
- **Output:** `{ type: 'chat', response: 'answer' }`
- **Error:** Throws if AI call fails

---

## Response Flow - Frontend to Backend

### Create Ticket Example

**Frontend sends:**

```json
{
  "userRequest": "Create a ticket for dark mode support",
  "boardContext": ""
}
```

**Chat route processes:**

1. Calls `orchestrate({ userMessage, selectedCards: [] })`
2. Orchestrator classifies as `CREATE_TICKET`
3. Routes to `ticketCreationAgent()`
4. Returns: `{ type: 'ticket_creation', data: { title, description, ... } }`
5. Route checks `result.type === 'ticket_creation'`
6. Transforms to: `{ success: true, ticketData: result.data }`

**Frontend receives:**

```json
{
  "success": true,
  "ticketData": {
    "title": "Add dark mode support",
    "description": "Implement dark theme...",
    "suggestedList": "Feature Requests",
    "priority": "Medium"
  }
}
```

### Edit Ticket Example

**Frontend sends:**

```json
{
  "userRequest": "improve the description",
  "cardContent": {
    "id": 1,
    "title": "Fix login bug",
    "description": "Users report login fails on Chrome"
  }
}
```

**Chat route processes:**

1. Calls `orchestrate({ userMessage, selectedCards: [cardContent] })`
2. Orchestrator classifies as `UPDATE_TICKET`
3. Routes to `updateAgent()`
4. Returns: `{ type: 'ticket_update', data: { title, description, reasoning }, cardId: 1 }`
5. Route checks `result.type === 'ticket_update'`
6. Transforms to: `{ success: true, ticketData: result.data, cardId: result.cardId }`

**Frontend receives:**

```json
{
  "success": true,
  "ticketData": {
    "title": "Fix login bug - Chrome",
    "description": "Users report login fails on Chrome...",
    "reasoning": "Added specific browser info..."
  },
  "cardId": 1
}
```

---

## Error Handling

### Errors Now Propagate to Frontend

**If something fails:**

1. Agent throws error
2. Orchestrator doesn't catch (no try-catch wrapper)
3. Chat route handler catches `error.message`
4. Returns HTTP 500: `{ error: "Specific error message from AI" }`
5. Frontend receives actual error instead of dummy data

**Example error flows:**

- No card selected for update: "Please select a single card to update"
- Invalid intent classification: "Invalid intent classification from AI: UNKNOWN_TYPE"
- JSON parsing failure: "Unexpected token in JSON at position X"
- API key invalid: "401 Incorrect API key provided"

---

## Validation Checklist

When testing, ensure:

- [ ] **Intent Classification**: AI correctly identifies CREATE_TICKET vs UPDATE_TICKET
- [ ] **Ticket Creation**: Generates proper JSON with all required fields
- [ ] **Ticket Update**: Only works with exactly 1 selected card
- [ ] **Summarize**: Requires at least 1 card selected
- [ ] **Knowledge**: Works with and without RAG
- [ ] **General Chat**: Responds to questions about selected cards
- [ ] **Error Messages**: Display actual AI errors, not generic messages
- [ ] **Response Format**: Frontend receives correct structure for each intent
- [ ] **No Fallbacks**: System fails cleanly if AI unavailable (no dummy data)

---

## Testing Scenarios

### Scenario 1: Create Ticket

```
User input: "Create a ticket for bug fixing"
Expected: AI classifies as CREATE_TICKET → ticketCreationAgent → returns ticket JSON
Frontend: Receives ticketData and displays suggestion
```

### Scenario 2: Update Ticket

```
User input: "improve the description" (with 1 card selected)
Expected: AI classifies as UPDATE_TICKET → updateAgent → returns improved ticket
Frontend: Receives ticketData with updated fields
```

### Scenario 3: Summarize Tasks

```
User input: "what are the most important tasks?" (with 3+ cards selected)
Expected: AI classifies as SUMMARIZE_PRIORITIZE → summarizePrioritizeAgent → returns analysis
Frontend: Receives response text with analysis
```

### Scenario 4: Knowledge Query

```
User input: "how to set up the project?"
Expected: AI classifies as KNOWLEDGE → knowledgeAgent → returns answer
Frontend: Receives response (from RAG if available, else general AI)
```

### Scenario 5: General Chat

```
User input: "tell me about this ticket" (with 1 card selected)
Expected: AI classifies as GENERAL_CHAT → generalChatAgent → returns answer
Frontend: Receives response about the selected card
```

---

## Files Modified

1. **`backend/services/agentOrchestrator.js`** - Removed all fallbacks and keyword logic
2. **`backend/routes/chat.js`** - Fixed response transformation and added validation

## Files Backed Up

No backup files are currently kept in the repository.

---

## Next Steps

1. **Test with valid OpenAI API key** - Set `OPENAI_API_KEY` in `.env`
2. **Verify each agent endpoint** - Test create, update, summarize, knowledge, chat
3. **Check error messages** - Ensure actual errors are propagated to frontend
4. **Monitor logs** - Watch for `[Orchestrator]`, `[*Agent]` debug messages
5. **No more dummy responses** - System should fail cleanly if AI unavailable

---

## Design Philosophy

✅ **Pure AI-Only**

- No keyword pattern matching
- No regex-based classification
- No fallback responses
- No dummy data

✅ **Proper Error Handling**

- Errors thrown immediately
- Error messages propagate to frontend
- Frontend users see actual issues
- No silent failures

✅ **Single Source of Truth**

- AI makes all decisions
- Consistent intent classification
- Consistent agent routing
- Consistent response format
