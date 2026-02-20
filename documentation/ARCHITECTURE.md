# 📊 TaskBoard Project Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                  │
│             http://localhost:5173                                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    HTTP/JSON (REST API)
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       │                       │
┌──────────────────────────────▼────────────────────────────────────┐
│                    REACT FRONTEND (Vite)                          │
│  ├─ React Router (Client-side routing)                            │
│  ├─ Components (Cards, Lists, Boards)                            │
│  ├─ Context API (Authentication State)                           │
│  ├─ Custom Hooks (useBoards, useLists, useCards)                │
│  └─ Axios Client (HTTP + JWT Interceptors)                       │
└──────────────────────────────┬────────────────────────────────────┘
                                │
                Rest API Calls + JWT Token
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
     /users         /boards,         /lists,
    /register      /lists,          /cards,
     /login        /cards,         /activity
                  /activity
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────┐
│              EXPRESS.JS BACKEND (Node.js)                           │
│  ├─ Routes (5 files for different endpoints)                       │
│  ├─ Authentication (JWT + Bcrypt)                                 │
│  ├─ Middleware (Auth verification)                                │
│  ├─ Database Connection Pool                                      │
│  └─ Error Handling & Validation                                   │
└──────────────────────────────┬────────────────────────────────────┘
                                │
                    Parameterized SQL Queries
                    (Prevention of SQL Injection)
                                │
┌───────────────────────────────▼────────────────────────────────────┐
│          POSTGRESQL DATABASE (Port 5432)                            │
│  ├─ users table (username, password_hash, email)                   │
│  ├─ boards table (user_id, title, images)                          │
│  ├─ lists table (board_id, title, order)                          │
│  ├─ cards table (list_id, title, description, order)              │
│  └─ activity_logs table (audit trail)                             │
└────────────────────────────────────────────────────────────────────┘
```

## Frontend Component Tree

```
App.jsx
├── AuthProvider (Context)
│   └── Router
│       ├── PublicRoute
│       │   ├── LoginPage
│       │   └── RegisterPage
│       └── ProtectedRoute
│           ├── DashboardPage
│           │   ├── useBoards Hook
│           │   ├── BoardCard (Grid)
│           │   │   └── Delete Board Button
│           │   └── CreateBoardModal
│           ├── BoardPage
│           │   ├── useLists Hook
│           │   ├── ListColumn (Sortable)
│           │   │   ├── useCards Hook
│           │   │   ├── CardItem (Draggable)
│           │   │   │   └── Drag Handle + Delete
│           │   │   └── CreateCardForm
│           │   └── CreateListForm
│           └── ActivityPage
│               ├── useActivity Hook
│               └── ActivityItem (Timeline)
```

## Data Flow Diagram

```
User Action
    │
    ▼
React Component
    │
    ▼
Custom Hook (useBoards/useLists/useCards)
    │
    ▼
Axios API Client
    │ (with JWT interceptor)
    ▼
HTTP Request
    │
    ▼
Express Route Handler
    │
    ▼
authenticateToken Middleware
    │ (Verify JWT)
    ▼
Route Logic
    │
    ▼
Database Query
    │ (Parameterized SQL)
    ▼
PostgreSQL
    │
    ▼
Database Result
    │
    ▼
JSON Response
    │
    ▼
Axios Response Handler
    │
    ▼
Hook State Update
    │
    ▼
Component Re-render
    │
    ▼
UI Update
```

## Authentication Flow

```
┌─────────────────┐
│  User registers │
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ POST /api/users/register │
│ - username, password     │
│ - email (optional)       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Backend:                 │
│ 1. Hash password         │
│ 2. Save to database      │
│ 3. Generate JWT          │
│ 4. Return token          │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Frontend:                │
│ 1. Store token in LS     │
│ 2. Set Auth Context      │
│ 3. Redirect dashboard    │
└──────────────────────────┘

──────────────── LOGIN FLOW ────────────────

        ┌─────────────────┐
        │ User logs in    │
        └────────┬────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ POST /api/users/login    │
        │ - username, password     │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Backend:                 │
        │ 1. Find user             │
        │ 2. Compare passwords     │
        │ 3. Generate JWT          │
        │ 4. Return token          │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Frontend:                │
        │ 1. Store token           │
        │ 2. Redirect dashboard    │
        │ (Token in Authorization: │
        │  Bearer <token>)         │
        └──────────────────────────┘

──────────────── API REQUEST FLOW ────────────────

    ┌──────────────────────────────┐
    │ Component calls API Hook     │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Hook calls apiClient         │
    │ (instance of Axios)          │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Axios Interceptor:           │
    │ Adds JWT to Headers:         │
    │ Authorization: Bearer <token>│
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ HTTP Request to Backend      │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Backend Route Handler        │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ authenticateToken Middleware:│
    │ 1. Extract token from header │
    │ 2. Verify JWT signature      │
    │ 3. Add userId to request     │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Route handler executes       │
    │ (userId available in req)    │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Database query with userId   │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Return JSON response         │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Frontend receives data       │
    │ Hook updates state           │
    │ Component re-renders         │
    └──────────────────────────────┘
```

## Database Schema Relationships

```
                      ┌─────────────────┐
                      │     users       │
                      ├─────────────────┤
                      │ id (PK)         │
                      │ username ◄───┐  │
                      │ password_hash │  │
                      │ email         │  │
                      │ created_at    │  │
                      └─────────────────┘
                            │ (1)
                            │
                      (Many)│
                            │ FK: user_id
                            │
                      ┌─────▼─────────────┐
                      │     boards       │
                      ├──────────────────┤
                      │ id (PK)          │
                      │ user_id (FK) ◄─┐ │
                      │ title           │ │
                      │ image_*         │ │
                      │ created_at      │ │
                      └─────┬────────────┘
                            │ (1)
                            │
                      (Many)│
                            │ FK: board_id
                            │
                      ┌─────▼─────────────┐
                      │      lists       │
                      ├──────────────────┤
                      │ id (PK)          │
                      │ board_id (FK) ◄┐ │
                      │ title           │ │
                      │ order_index     │ │
                      │ created_at      │ │
                      └─────┬────────────┘
                            │ (1)
                            │
                      (Many)│
                            │ FK: list_id
                            │
                      ┌─────▼─────────────┐
                      │      cards       │
                      ├──────────────────┤
                      │ id (PK)          │
                      │ list_id (FK) ◄─┐ │
                      │ title           │ │
                      │ description     │ │
                      │ order_index     │ │
                      │ created_at      │ │
                      └──────────────────┘

        ┌────────────────────────────────────────┐
        │     activity_logs (Audit Trails)       │
        ├────────────────────────────────────────┤
        │ id (PK)                                │
        │ user_id (FK) ──► references users     │
        │ action (CREATE|UPDATE|DELETE)         │
        │ entity_type (BOARD|LIST|CARD)         │
        │ entity_id, entity_title               │
        │ created_at                            │
        └────────────────────────────────────────┘

Cascade Delete:
- Delete User → Delete all their Boards
- Delete Board → Delete all its Lists
- Delete List → Delete all its Cards
```

## File Dependencies Graph

```
Frontend Entry:
main.jsx
  └── App.jsx
      ├── AuthContext.jsx
      │   └── AuthProvider wrapper
      ├── LoginPage.jsx
      ├── RegisterPage.jsx
      ├── DashboardPage.jsx
      │   ├── useBoards (from useApi.js)
      │   └── BoardCard.jsx
      ├── BoardPage.jsx
      │   ├── useLists (from useApi.js)
      │   ├── useCards (from useApi.js)
      │   ├── ListColumn.jsx
      │   │   └── CardItem.jsx
      │   └── CreateCardForm.jsx
      └── ActivityPage.jsx
          └── useActivity (from useApi.js)

useApi.js
  └── apiClient.js
      └── axios (HTTP library)
         └── localStorage (JWT token)

Backend Entry:
index.js (Express server)
├── db.js (PostgreSQL connection)
├── auth.js (Password & JWT utilities)
├── middleware.js (JWT verification)
└── routes/
    ├── users.js
    ├── boards.js
    ├── lists.js
    ├── cards.js
    └── activity.js
```

## Process Flows

### Creating a Board Flow

```
User clicks "New Board"
    ↓
BoardCard shown
    ↓
User enters title & selects image
    ↓
Click "Create Board"
    ↓
CreateBoardModal validates input
    ↓
POST /api/boards (with JWT)
    ↓
Backend validates & creates board
    ↓
Activity log recorded
    ↓
Board added to boards state
    ↓
Dashboard re-renders with new board
```

### Drag & Drop Card Flow

```
User initializes drag on CardItem
    ↓
CSS cursor changes to grabbing
    ↓
@dnd-kit tracks drag position
    ↓
Visual feedback (opacity changes)
    ↓
User drops card
    ↓
Check target list
    ↓
Calculate new position
    ↓
PATCH /api/cards/:id with new position
    ↓
Backend updates card's list_id & order
    ↓
Activity log recorded
    ↓
Frontend state updates
    ↓
Cards re-render in correct position
```

---

**This architecture ensures:**

- ✅ Clear separation of concerns
- ✅ Secure data flow (JWT + parameterized queries)
- ✅ User data isolation
- ✅ Scalable design
- ✅ Performance (connection pooling)
- ✅ Maintainability (modular code)
