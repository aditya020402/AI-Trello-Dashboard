# TaskBoard - Docker PostgreSQL + Local Development Setup

This setup uses Docker to run PostgreSQL only, while the backend and frontend run directly from your terminal for easier development.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- npm installed

## Quick Start

### 1. Start PostgreSQL Docker Container

```bash
cd /Users/darknight/Developer/taskboard
docker-compose up
```

This starts the PostgeSQL container and initializes the database.

**Expected output:**

```
taskboard-postgres | database system is ready to accept connections
```

### 2. Start Backend Server (in a new terminal)

```bash
cd /Users/darknight/Developer/taskboard/backend
npm install  # First time only
npm run dev
```

**Expected output:**

```
Server running on http://localhost:5000
```

### 3. Start Frontend Server (in another new terminal)

```bash
cd /Users/darknight/Developer/taskboard/frontend
npm install  # First time only
npm run dev
```

**Expected output:**

```
➜  Local:   http://localhost:5173/
```

### 4. Access the Application

Open http://localhost:5173 in your browser

---

## Service Access Points

| Service     | URL                       | Details                                       |
| ----------- | ------------------------- | --------------------------------------------- |
| Frontend    | http://localhost:5173     | React/Vite app                                |
| Backend API | http://localhost:5000/api | Express.js API                                |
| PostgreSQL  | localhost:5432            | Database (user: postgres, password: password) |

---

## Useful Commands

### PostgreSQL Database Access

```bash
# Connect to the database
docker exec -it taskboard-postgres psql -U postgres -d taskboard

# View tables
\dt

# Query users
SELECT * FROM users;

# Exit
\q
```

### Docker Management

```bash
# View logs
docker-compose logs -f postgres

# Stop PostgreSQL
docker-compose down

# Stop and remove data
docker-compose down -v

# Restart
docker-compose restart postgres
```

### Backend Tests

```bash
# Register a test user
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

---

## Development Workflow

### Making Changes

- **Backend Code**: Edit files in `backend/` → Changes auto-reload with nodemon
- **Frontend Code**: Edit files in `frontend/src/` → Changes auto-reload in browser
- **Database Schema**: Modify `backend/init_db.sql` → Restart with `docker-compose down -v && docker-compose up`

### Adding Dependencies

```bash
# For backend
cd backend
npm install new-package
npm run dev

# For frontend
cd frontend
npm install new-package
npm run dev
```

---

## Troubleshooting

### PostgreSQL Won't Start

```bash
# Check if port 5432 is in use
lsof -i :5432

# Clean restart
docker-compose down -v
docker-compose up
```

### Backend Can't Connect to Database

```bash
# Verify PostgreSQL is running
docker-compose ps

# Check connection
docker exec -it taskboard-postgres pg_isready -U postgres

# Verify .env has correct settings
cat backend/.env
```

### Frontend Can't Connect to Backend

- Ensure backend is running on port 5000
- Check `frontend/src/lib/apiClient.js` has `localhost:5000`

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use a different port in backend/server.js
```

---

## Summary

- ✅ PostgreSQL runs in Docker
- ✅ Backend runs locally from terminal
- ✅ Frontend runs locally from terminal
- ✅ Easy to debug and develop
- ✅ Hot reload on both backend and frontend

Enjoy developing! 🚀
