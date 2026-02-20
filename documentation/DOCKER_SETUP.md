# Docker Setup Guide for TaskBoard

This guide provides comprehensive instructions for running the TaskBoard application using Docker and Docker Compose.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Overview](#overview)
3. [Quick Start](#quick-start)
4. [Environment Configuration](#environment-configuration)
5. [Docker Commands](#docker-commands)
6. [Troubleshooting](#troubleshooting)
7. [Development Workflow](#development-workflow)
8. [Production Considerations](#production-considerations)

---

## Prerequisites

Before you start, ensure you have:

- **Docker**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Includes Docker CLI and Docker Compose
- **Docker Compose**: Usually installed with Docker Desktop
- **macOS/Linux**: Verify installation with `docker --version` and `docker-compose --version`

### Verify Installation

```bash
docker --version
docker-compose --version
docker run hello-world
```

---

## Overview

The Docker setup includes:

- **PostgreSQL 15 (Alpine)**: Lightweight database container
- **Node.js Backend**: Express.js application container
- **Shared Network**: Secure internal communication between containers
- **Persistent Volumes**: Database data persists across container restarts
- **Health Checks**: Ensures PostgreSQL is ready before backend starts

### Architecture

```
┌─────────────────────────────────────────────────┐
│          Docker Network (taskboard-network)     │
├──────────────────────┬──────────────────────────┤
│                      │                          │
│  PostgreSQL          │      Backend             │
│  (taskboard-postgres)│  (taskboard-backend)     │
│  Port: 5432          │  Port: 5000              │
│  Data Volume:        │                          │
│  postgres_data       │  Mount: ./backend        │
│                      │                          │
└──────────────────────┴──────────────────────────┘
         ↑                          ↑
         │                          │
         └──────── localhost ───────┘

Browser/Frontend connects to backend at localhost:5000
```

---

## Quick Start

### 1. Start All Containers

```bash
cd /Users/darknight/Developer/taskboard
docker-compose up --build
```

**Output indicates success when you see:**

```
taskboard-postgres  | database system is ready to accept connections
taskboard-backend   | Server running on http://localhost:5000
```

### 2. Start Frontend (in a new terminal)

```bash
cd /Users/darknight/Developer/taskboard/frontend
npm install  # First time only
npm run dev
```

**Frontend running on:** http://localhost:5173

### 3. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Create an account**: Register new user on signup page

---

## Environment Configuration

### Backend Environment Variables

The backend uses these environment variables (from `.env`):

```env
DB_USER=postgres           # PostgreSQL username
DB_PASSWORD=password       # PostgreSQL password
DB_HOST=postgres           # Service name (Docker Compose)
DB_PORT=5432              # PostgreSQL port inside container
DB_NAME=taskboard         # Database name
NODE_ENV=development      # Node environment
JWT_SECRET=your-secret-key-change-this-in-production-12345
PORT=5000                 # Backend server port
```

### Important Note: DB_HOST

**Inside Docker:**

- Use `DB_HOST=postgres` (the service name from docker-compose.yml)
- Docker Compose automatically resolves service names to container IPs

**Outside Docker (local development):**

- Use `DB_HOST=localhost`
- Direct connection to your local PostgreSQL

The `.env` file is currently configured for Docker with `DB_HOST=postgres`.

---

## Docker Commands

### Starting & Stopping

```bash
# Start containers in foreground (see logs)
docker-compose up

# Start containers in background
docker-compose up -d

# Build images without starting
docker-compose build

# Build and start
docker-compose up --build

# Stop running containers
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Stop and remove everything including volumes (clears database)
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f backend

# Last 50 lines
docker-compose logs --tail=50

# Follow logs for backend
docker-compose logs -f backend
```

### Accessing Containers

```bash
# Execute command in container
docker exec -it taskboard-backend bash
docker exec -it taskboard-postgres bash

# Access PostgreSQL database
docker exec -it taskboard-postgres psql -U postgres -d taskboard

# Check running containers
docker-compose ps

# View container details
docker inspect taskboard-postgres
```

### Database Operations

```bash
# Connect to PostgreSQL inside container
docker exec -it taskboard-postgres psql -U postgres -d taskboard

# Example: Run a query
docker exec -it taskboard-postgres psql -U postgres -d taskboard -c "SELECT * FROM users;"

# Run initialization script again
docker exec -it taskboard-postgres psql -U postgres -d taskboard -f /docker-entrypoint-initdb.d/init_db.sql

# Backup database
docker exec taskboard-postgres pg_dump -U postgres -d taskboard > backup.sql

# Restore database
docker exec -i taskboard-postgres psql -U postgres -d taskboard < backup.sql
```

---

## Troubleshooting

### 1. Port Already in Use

If you see `Address already in use`:

```bash
# Find process using port 5432 (PostgreSQL) or 5000 (Backend)
lsof -i :5432
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change ports in docker-compose.yml
```

### 2. Container Won't Start

```bash
# Check logs
docker-compose logs postgres
docker-compose logs backend

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### 3. Database Connection Error

If backend can't connect to PostgreSQL:

```bash
# Verify PostgreSQL is running
docker-compose ps

# Check PostgreSQL health
docker exec taskboard-postgres pg_isready -U postgres

# Verify network connectivity
docker exec taskboard-backend ping postgres

# Check .env file has correct credentials
cat backend/.env
```

### 4. Database Schema Not Loaded

```bash
# Check if init_db.sql was executed
docker exec -it taskboard-postgres psql -U postgres -d taskboard -c "\dt"

# Manually load schema
docker exec -it taskboard-postgres psql -U postgres -d taskboard -f /docker-entrypoint-initdb.d/init_db.sql
```

### 5. Volume Permission Issues

```bash
# On macOS/Linux, ensure proper permissions
chmod 755 backend
chmod 644 backend/init_db.sql

# Rebuild with clean volumes
docker-compose down -v
docker-compose up --build
```

### 6. Node Modules Issues

```bash
# Clear node_modules in container
docker-compose exec backend rm -rf node_modules

# Rebuild
docker-compose down
docker-compose up --build
```

---

## Development Workflow

### Making Backend Changes

1. **Edit code** in `backend/` (e.g., routes, middleware)
2. **Auto-reload**: Backend auto-reloads with nodemon (watch mode enabled)
3. **Check logs**: `docker-compose logs -f backend`
4. **No rebuild needed** for code changes (unless you change dependencies)

### Adding New Dependencies

```bash
# Inside container
docker-compose exec backend npm install new-package

# Or modify package.json then rebuild
docker-compose down
docker-compose up --build
```

### Database Changes

If you modify `init_db.sql`:

```bash
# Option 1: Recreate everything (clears data)
docker-compose down -v
docker-compose up --build

# Option 2: Manually run updated schema
docker exec -it taskboard-postgres psql -U postgres -d taskboard
# Then paste your SQL commands
```

### Testing Endpoints

```bash
# When containers are running
curl http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

---

## Production Considerations

### Security Improvements Needed

Before deploying to production, update:

1. **Credentials** in docker-compose.yml:

   ```yaml
   POSTGRES_PASSWORD: change-to-strong-password-here
   ```

2. **Environment file**: Move sensitive data to `.env.production`

3. **JWT Secret** in `.env`:

   ```env
   JWT_SECRET: generate-a-strong-secret-key
   ```

4. **Remove debug logging** from backend code

### Production Deployment

```bash
# Use docker-compose production override
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# See docker-compose.prod.yml example below
```

### Example Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    restart: always

  backend:
    environment:
      NODE_ENV: production
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    restart: always
    ports:
      - "5000:5000"
```

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

## FAQ

**Q: How do I change the database password?**
A: Edit `docker-compose.yml` → change `POSTGRES_PASSWORD` and update `backend` → `DB_PASSWORD` environment variable. Rebuild with `docker-compose down -v && docker-compose up --build`

**Q: Can I use a different PostgreSQL version?**
A: Yes, edit `docker-compose.yml` → change `image: postgres:15-alpine` to any version from [Docker Hub](https://hub.docker.com/_/postgres)

**Q: How do I backup my database?**
A: Use `docker exec taskboard-postgres pg_dump -U postgres -d taskboard > backup.sql`

**Q: Can I run just the database without the backend?**
A: Yes, run `docker-compose up postgres` or use a separate docker-compose configuration

**Q: How do I debug the backend in Docker?**
A: View logs with `docker-compose logs -f backend` and check the backend service output

---

Last Updated: February 2026
