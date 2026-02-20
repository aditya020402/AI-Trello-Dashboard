# Taskboard MCP Server - Usage Examples

Real-world examples of how to use the Taskboard MCP Server with GitHub Copilot.

## Basic Queries

### 1. List All Workspaces

**Natural Language:**

```
@taskboard What workspaces do I have?
@taskboard Show me all my workspaces
```

**Response:**

```json
[
  {
    "id": 1,
    "name": "GitLab",
    "description": "All imported GitLab projects and issues",
    "created_at": "2026-02-19T10:00:00Z"
  },
  {
    "id": 2,
    "name": "Personal Projects",
    "description": "My personal work",
    "created_at": "2026-02-20T14:30:00Z"
  }
]
```

### 2. List Boards in a Workspace

**Natural Language:**

```
@taskboard What boards are in workspace 1?
@taskboard Show me the boards in the GitLab workspace
@taskboard List all boards
```

**Response:**

```json
[
  {
    "id": 1,
    "title": "Backend API Redesign",
    "workspace_id": 1,
    "created_at": "2026-02-19T11:00:00Z"
  },
  {
    "id": 2,
    "title": "Frontend Components",
    "workspace_id": 1,
    "created_at": "2026-02-19T11:30:00Z"
  }
]
```

### 3. List Columns/Lists in a Board

**Natural Language:**

```
@taskboard What columns are in board 1?
@taskboard Show the kanban columns for the Backend board
@taskboard List all lists in board 2
```

**Response:**

```json
[
  {
    "id": 1,
    "title": "To Do",
    "board_id": 1,
    "order_index": 0
  },
  {
    "id": 2,
    "title": "In Progress",
    "board_id": 1,
    "order_index": 1
  },
  {
    "id": 3,
    "title": "Review",
    "board_id": 1,
    "order_index": 2
  },
  {
    "id": 4,
    "title": "Done",
    "board_id": 1,
    "order_index": 3
  }
]
```

### 4. List Cards in a List

**Natural Language:**

```
@taskboard What tasks are in the To Do list?
@taskboard Show all cards in list 1
@taskboard What work is in progress?
```

**Response:**

```json
[
  {
    "id": 1,
    "title": "Setup database connection pool",
    "description": "Implement connection pooling for better performance",
    "list_id": 1,
    "order_index": 0
  },
  {
    "id": 2,
    "title": "Create API authentication middleware",
    "description": "Implement JWT authentication for all endpoints",
    "list_id": 1,
    "order_index": 1
  }
]
```

## Search Operations

### 5. Search for Cards

**Natural Language:**

```
@taskboard Find all tasks about authentication
@taskboard Search for cards containing "database"
@taskboard Show me everything related to "API"
@taskboard Find unfinished work on the frontend
```

**Example:**

```
@taskboard Search for "database migration"
```

**Response:**

```json
[
  {
    "id": 5,
    "title": "Database migration for user schema",
    "description": "Add new fields to users table",
    "list_id": 2
  },
  {
    "id": 8,
    "title": "Document database setup",
    "description": "Create migration guides",
    "list_id": 3
  }
]
```

## Update Operations

### 6. Modify Card Descriptions

**Natural Language:**

```
@taskboard Update card 3 to have description "Setup Redis cache for sessions"
@taskboard Change card 5 description: Make it clear we need to handle timeouts
@taskboard Update issue 10 with the new requirements
```

**Tool Call:**

```
update_card_description(
  card_id: 3,
  description: "Setup Redis cache for sessions. Handle connection timeouts and implement retry logic."
)
```

**Response:**

```json
{
  "success": true,
  "card": {
    "id": 3,
    "title": "Setup session caching",
    "description": "Setup Redis cache for sessions. Handle connection timeouts and implement retry logic.",
    "list_id": 2
  }
}
```

### 7. Update Card Titles

**Natural Language:**

```
@taskboard Rename card 4 to "Implement OAuth2 authentication"
@taskboard Change issue 2 title to "Fix login form validation"
```

**Tool Call:**

```
update_card_title(
  card_id: 4,
  title: "Implement OAuth2 authentication"
)
```

**Response:**

```json
{
  "success": true,
  "card": {
    "id": 4,
    "title": "Implement OAuth2 authentication",
    "description": "User wants OAuth2 support for third-party login"
  }
}
```

## Move Operations

### 8. Move Cards Between Lists

**Natural Language:**

```
@taskboard Move card 1 to the "In Progress" list
@taskboard Mark issue 5 as done
@taskboard Move the authentication task to review
@taskboard Send card 3 to the Done column
```

**Tool Call:**

```
move_card(
  card_id: 1,
  list_id: 2
)
```

**Response:**

```json
{
  "success": true,
  "card": {
    "id": 1,
    "title": "Setup database connection pool",
    "list_id": 2,
    "description": "Implement connection pooling for better performance"
  }
}
```

**Multi-card example:**

```
@taskboard Move cards 5, 6, and 7 from To Do to In Progress
```

Would require 3 separate move operations:

```
move_card(card_id: 5, list_id: 2)
move_card(card_id: 6, list_id: 2)
move_card(card_id: 7, list_id: 2)
```

## Create Operations

### 9. Create New Cards

**Natural Language:**

```
@taskboard Create a new task "Write API documentation" in the To Do list
@taskboard Add "Fix critical bug in checkout" to list 1
@taskboard Create an issue "Refactor authentication module" in the review list
```

**Tool Call:**

```
create_card(
  list_id: 1,
  title: "Write API documentation",
  description: "Document all REST endpoints and their parameters"
)
```

**Response:**

```json
{
  "success": true,
  "card": {
    "id": 42,
    "title": "Write API documentation",
    "description": "Document all REST endpoints and their parameters",
    "list_id": 1,
    "order_index": 2
  }
}
```

## Real-World Workflows

### Workflow 1: Daily Standup Preparation

```
@taskboard List all my workspaces
@taskboard Show boards in workspace 1
@taskboard What's in the In Progress column?
@taskboard Find cards that are blocked
```

### Workflow 2: Sprint Planning

```
@taskboard List all To Do items in board 1
@taskboard Search for high priority tasks
@taskboard Show me all cards not yet assigned
@taskboard Move cards 1-5 to In Progress
```

### Workflow 3: Code Review Integration

```
@taskboard Find all cards in the Review column
@taskboard Update card 10 description with review comments
@taskboard Move card 10 to Done after review
```

### Workflow 4: Status Update

```
@taskboard Mark card 5 as done
@taskboard Move card 7 to In Progress
@taskboard Create a card "Test the API changes"
```

### Workflow 5: Bug Triage

```
@taskboard Search for "bug"
@taskboard Create a card "Investigate critical performance issue"
@taskboard Add description: "Users report slow login on mobile"
```

## Advanced Scenarios

### Scenario 1: Bulk Status Update

```
@taskboard I just finished cards 3, 4, and 6. Move them to Done.
```

This would trigger:

```
move_card(card_id: 3, list_id: 4)
move_card(card_id: 4, list_id: 4)
move_card(card_id: 6, list_id: 4)
```

### Scenario 2: Task Refinement

```
@taskboard Show me card 8
@taskboard Update its description with more details
@taskboard Move it to In Progress since I'm working on it
```

### Scenario 3: Project Overview

```
@taskboard Tell me about my workspaces
@taskboard For each workspace, show the boards
@taskboard What's the current status of all boards
```

## Tips & Tricks

### 1. Combine Multiple Operations

```
@taskboard Create a new card "Deploy to staging" in the To Do list, then move it to In Progress
```

### 2. Use Context from Previous Messages

```
@copilot List cards about "authentication"
@copilot Move the first one to review

# Copilot remembers the card ID from the first query
```

### 3. Get Full Card Details Before Updating

```
@taskboard Show me card 5 details
@taskboard Update its description based on what I'm seeing
```

### 4. Bulk Operations

```
@taskboard Find all cards in "To Do" with "bug" in the title, then move them to "Urgent"
```

## Natural Language Examples

These are all valid ways to interact with the MCP server:

```
"Add a bug fix task to my backlog"
"What am I currently working on?"
"Mark all review tasks as done"
"Create a new issue for user feedback"
"Show me what's left to do"
"Move the deployment task to in-progress"
"Find all unfinished work"
"Create and immediately move a card to review"
"Update the description of that last card"
"What needs to be tested?"
```

---

For more information, see [README.md](./README.md) or [SETUP_GUIDE.md](./SETUP_GUIDE.md)
