# TaskBoard Docker Setup - Quick Start Guide

## ✅ Docker Environment is Running!

Your TaskBoard application is now running with a Docker PostgreSQL container. Here's what's active:

### Running Containers

- **PostgreSQL Database**: `taskboard-postgres` on `localhost:5432`
- **Backend Server**: `taskboard-backend` on `localhost:5010`
- **Database**: `taskboard` (automatically initialized)

### Access Points

```
Backend API:    http://localhost:5010/api
PostgreSQL:     localhost:5432 (user: postgres, password: password)
```

---

## Running the Frontend

Open a new terminal and start the frontend development server:

```bash
cd /Users/darknight/Developer/taskboard/frontend
npm install  # First time only
npm run dev
```

Frontend will run on: **http://localhost:5173**

---

## Useful Docker Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# PostgreSQL only
docker-compose logs -f postgres
```

### Access Database

```bash
# Connect to PostgreSQL inside the container
docker exec -it taskboard-postgres psql -U postgres -d taskboard

# Example: List all tables
\dt

# Example: Query users
SELECT * FROM users;
```

### Stop & Start Services

```bash
# Stop everything
docker-compose down

# Start everything again
docker-compose up

# Rebuild (if you change Dockerfile or dependencies)
docker-compose up --build

# Stop and remove everything including data
docker-compose down -v
```

### Check Container Status

```bash
# See running containers
docker-compose ps

# View resource usage
docker stats
```

---

## Configuration

### Backend Environment Variables

The backend is configured with (`backend/.env`):

- `DB_HOST=postgres` (Docker service name)
- `DB_PORT=5432`
- `DB_USER=postgres`
- `DB_PASSWORD=password`
- `DB_NAME=taskboard`

### Port Mapping

| Service    | Container Port | Host Port |
| ---------- | -------------- | --------- |
| Backend    | 5000           | 5010      |
| PostgreSQL | 5432           | 5432      |

---

## Test the Setup

### 1. Backend Health Check

```bash
curl http://localhost:5010/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

### 2. Database Connection Check

```bash
docker exec -it taskboard-postgres pg_isready -U postgres
```

### 3. Frontend Test

Open http://localhost:5173 in your browser and try to register an account.

---

## Development Workflow

### Editing Backend Code

1. Edit files in `backend/` folder
2. Changes auto-reload with nodemon
3. Check logs: `docker-compose logs -f backend`

### Editing Frontend Code

1. Edit files in `frontend/src/` folder
2. Vite auto-reloads in the browser
3. Frontend connects to backend on `localhost:5010`

### Adding Backend Dependencies

```bash
# Edit backend/package.json, then:
docker-compose down
docker-compose up --build
```

---

## Database Information

**Database Name**: taskboard

**Tables Created**:

- `users` - User accounts and authentication
- `boards` - Kanban boards
- `lists` - Board columns/lists
- `cards` - Individual task cards
- `activity` - Activity log for auditing

**Connection String** (from inside containers):

```
postgresql://postgres:password@postgres:5432/taskboard
```

**Connection String** (from host/local):

```
postgresql://postgres:password@localhost:5432/taskboard
```

---

## Troubleshooting

### Containers Won't Start

```bash
# Clean restart
docker-compose down -v
docker-compose up --build
```

### Port Already in Use

- Backend is on port 5010 (not 5000)
- PostgreSQL is on port 5432

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker exec -it taskboard-postgres pg_isready -U postgres

# Verify network connectivity
docker exec taskboard-backend ping postgres
```

### Frontend Can't Connect to Backend

- Ensure backend is running: `docker-compose ps`
- Verify backend logs: `docker-compose logs -f backend`
- Check frontend config uses `localhost:5010`: [frontend/src/lib/apiClient.js](frontend/src/lib/apiClient.js)

---

## Next Steps

1. ✅ Backend and database are running
2. ⏭️ Start the frontend: `npm run dev` in the frontend folder
3. ⏭️ Open http://localhost:5173 and test the application
4. ⏭️ Create boards and cards to test functionality

---

## For More Information

- See [DOCKER_SETUP.md](DOCKER_SETUP.md) for complete Docker documentation
- See [SETUP_GUIDE.md](SETUP_GUIDE.md) for full installation options (Docker or local PostgreSQL)
- See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for development instructions

---

**Status**: ✅ Docker PostgreSQL container is running and connected
**Backend**: ✅ Running on localhost:5010
**Database**: ✅ Initialized with schema
