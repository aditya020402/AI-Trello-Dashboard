# TaskBoard Developer Guide

## Architecture Overview

TaskBoard follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────┐
│         Frontend (React/Vite)               │
│  - Components, Pages, Routing, State        │
└────────────────┬────────────────────────────┘
                 │ HTTP/REST API
                 ↓
┌─────────────────────────────────────────────┐
│       Backend (Express.js)                  │
│  - Routes, Auth, Validation, Business Logic│
└────────────────┬────────────────────────────┘
                 │ SQL Queries
                 ↓
┌─────────────────────────────────────────────┐
│    Database (PostgreSQL)                    │
│  - Tables, Constraints, Transactions        │
└─────────────────────────────────────────────┘
```

## Frontend Architecture

### Component Hierarchy

```
App (Router Setup)
├── AuthProvider (Context)
├── LoginPage
├── RegisterPage
├── DashboardPage
│   ├── BoardList (Grid)
│   │   └── BoardCard (Item)
│   └── CreateBoardModal
├── BoardPage
│   ├── ListContainer
│   │   └── ListColumn (Multiple)
│   │       ├── CardItem (Sortable)
│   │       └── CreateCardForm
│   └── CreateListForm
└── ActivityPage
    └── ActivityTimeline
        └── ActivityItem (List)
```

### State Management

**React Context for Auth**

```javascript
// AuthContext.jsx
- user: Current user object
- token: JWT token
- loading: Loading state
- Methods: register(), login(), logout()
```

**Custom Hooks for API**

```javascript
// useApi.js
-useBoards() - // Fetch and manage boards
  useLists() - // Fetch and manage lists
  useCards() - // Fetch and manage cards
  useActivity(); // Fetch activity logs
```

### Data Flow

```
Component
  ↓
useApi Hook
  ↓
apiClient (Axios)
  ↓
Backend API
  ↓
Database
```

## Backend Architecture

### Route Structure

```
backend/
├── routes/
│   ├── users.js      (Auth endpoints)
│   ├── boards.js     (Board CRUD)
│   ├── lists.js      (List CRUD)
│   ├── cards.js      (Card CRUD)
│   └── activity.js   (Audit logs)
├── index.js          (Express setup)
├── db.js             (Database connection)
├── auth.js           (Auth utilities)
└── middleware.js     (JWT verification)
```

### Request/Response Flow

```
HTTP Request
  ↓
Express Router (routes/)
  ↓
Middleware (authenticateToken)
  ↓
Route Handler
  ↓
Database Query (db.js)
  ↓
JSON Response
```

## Database Design

### Entity Relationships

```
User (1) ──→ (Many) Board
     │
     └──→ (Many) ActivityLog

Board (1) ──→ (Many) List

List (1) ──→ (Many) Card

User's boards cascade delete:
- Delete User → Delete all their Boards
- Delete Board → Delete all Lists
- Delete List → Delete all Cards
```

### Query Patterns

```javascript
// Get user's boards
SELECT * FROM boards WHERE user_id = $1

// Get board's lists
SELECT * FROM lists WHERE board_id = $1

// Get list's cards with auth check
SELECT c.* FROM cards c
JOIN lists l ON c.list_id = l.id
JOIN boards b ON l.board_id = b.id
WHERE c.list_id = $1 AND b.user_id = $2

// Activity log for user
SELECT * FROM activity_logs
WHERE user_id = $1
ORDER BY created_at DESC
```

## Authentication Flow

### Login Flow

```
User Input (username, password)
  ↓
POST /api/users/login
  ↓
Find user by username
  ↓
Compare password with hash (bcrypt)
  ↓
Generate JWT token
  ↓
Return token + user data
  ↓
Store token in localStorage
  ↓
Redirect to dashboard
```

### Protected Route Flow

```
API Request
  ↓
Check Authorization header
  ↓
Extract token (Bearer <token>)
  ↓
Verify JWT (jwt.verify)
  ↓
Extract userId from token
  ↓
Add userId to request
  ↓
Proceed with route handler
```

## Key Implementation Details

### JWT Token Structure

```javascript
{
  userId: 123,
  iat: 1234567890,
  exp: 1234654290
}
```

### API Response Format

**Success:**

```json
{
  "id": 1,
  "username": "user",
  "email": "user@example.com",
  "token": "eyJhbGc..."
}
```

**Error:**

```json
{
  "error": "Description of what went wrong"
}
```

## Development Guide

### Adding a New Feature

**1. Database Schema Update**

```sql
-- Add to backend/init_db.sql
ALTER TABLE table_name ADD COLUMN new_column TYPE;
```

**2. Backend Route**

```javascript
// backend/routes/newfeature.js
router.post("/", authenticateToken, async (req, res) => {
  // Validation
  // Database operation
  // Error handling
  // Response
});
```

**3. API Client Hook**

```javascript
// frontend/src/hooks/useApi.js
export const useNewFeature = () => {
  const [data, setData] = useState([]);
  const fetchData = useCallback(async () => {
    const response = await apiClient.get("/endpoint");
    setData(response.data);
  }, []);
  return { data, fetchData };
};
```

**4. React Component**

```jsx
// frontend/src/components/NewFeature.jsx
export default function NewFeature() {
  const { data, loading, error, fetchData } = useNewFeature();

  useEffect(() => {
    fetchData();
  }, []);

  return <div>{/* Component JSX */}</div>;
}
```

### Best Practices

#### Backend

1. **Always validate input**

   ```javascript
   if (!title || !title.trim()) {
     return res.status(400).json({ error: "Title required" });
   }
   ```

2. **Check user ownership**

   ```javascript
   const result = await query(
     "SELECT * FROM boards WHERE id = $1 AND user_id = $2",
     [id, req.userId],
   );
   ```

3. **Log actions for audit trail**
   ```javascript
   await query("INSERT INTO activity_logs (...) VALUES (...)", [
     userId,
     action,
     entityType,
     entityId,
     title,
   ]);
   ```

#### Frontend

1. **Use custom hooks for API logic**

   ```javascript
   const { data, loading, error, fetchData } = useApi();
   ```

2. **Handle loading and error states**

   ```javascript
   if (loading) return <div>Loading...</div>;
   if (error) return <div>{error}</div>;
   ```

3. **Implement proper error boundaries**
   ```javascript
   try {
     await createBoard(data);
   } catch (err) {
     setError(err.message);
   }
   ```

## Common Tasks

### Modifying User Authentication

- Edit `/backend/routes/users.js`
- Update JWT expiry in `/backend/auth.js`
- Change password hashing in `/backend/auth.js`

### Adding New API Endpoints

1. Create route handler in appropriate file
2. Add route to Express app in `index.js`
3. Create API client method in `useApi.js`
4. Create React component that uses the hook

### Changing Database Schema

1. Update `init_db.sql`
2. Recreate database: `psql -U postgres -d taskboard -f backend/init_db.sql`
3. Update related queries in route handlers
4. Update frontend components as needed

### Styling Components

- Add CSS to corresponding `.css` file
- Use CSS classes for components
- Follow naming convention: `.component-name`

## Performance Optimization

### Database

- Use indexes on frequently queried columns ✓ (Already implemented)
- Limit query results with LIMIT/OFFSET
- Cache frequently accessed data

### Frontend

- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Lazy load images
- Code splitting with React.lazy

### API

- Implement pagination for activity logs
- Use query parameters for filtering
- Cache responses client-side

## Testing (Future Enhancement)

```javascript
// Example test with Jest
describe("Users API", () => {
  test("should register new user", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({ username: "test", password: "pass" });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
  });
});
```

## Deployment Considerations

### Environment Variables (Production)

```bash
JWT_SECRET=<strong-random-secret>
DB_PASSWORD=<strong-db-password>
NODE_ENV=production
```

### Database Backups

```bash
pg_dump taskboard > backup.sql
psql taskboard < backup.sql
```

### Scaling

- Use connection pooling for database
- Implement caching layer (Redis)
- Use load balancer for multiple servers
- Consider serverless architecture

## Monitoring & Logging

### Current Implementation

- Console logging in middleware
- Query execution timing in `db.js`
- Error logging in route handlers

### Improvements

- Implement structured logging (Winston)
- Add request/response logging
- Monitor database performance
- Alert on errors

## Security Checklist

- [x] Password hashing with bcrypt
- [x] JWT token authentication
- [x] CORS protection
- [x] SQL injection prevention (parameterized queries)
- [x] User data isolation
- [x] Cascade delete for data consistency
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] HTTPS in production
- [ ] Database encryption at rest

## Code Style Guide

### JavaScript/JSX

```javascript
// Use const/let
const value = 5;

// Use arrow functions
const handleClick = () => {};

// Use destructuring
const { id, title } = board;

// Use template literals
const message = `Hello ${name}`;
```

### CSS

```css
/* Use semantic class names */
.board-card {
}
.list-column {
}

/* Group related properties */
.element {
  display: flex;
  align-items: center;
  gap: 10px;

  color: #333;
  background: white;

  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## Troubleshooting Development

### Hot Module Replacement (HMR) not working

```bash
# Restart dev server
npm run dev
```

### Database changes not reflected

```bash
# Restart backend
# Clear browser cache
```

### Dependencies conflict

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

**For more info, see README.md and SETUP_GUIDE.md**
