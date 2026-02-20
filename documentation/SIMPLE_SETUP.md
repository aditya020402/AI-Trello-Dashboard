# ✅ TaskBoard Setup - Docker PostgreSQL + Local Development

Your TaskBoard application is now set up with:

- **PostgreSQL** running in a Docker container
- **Backend** and **Frontend** running directly from your terminal

## What's Running Now

```bash
# Terminal 1: PostgreSQL Container
docker-compose up
→ PostgreSQL running on localhost:5432

# Terminal 2: Backend Express Server
cd backend && npm run dev
→ Backend running on localhost:3000

# Terminal 3: Frontend Vite Server
cd frontend && npm run dev
→ Frontend running on localhost:5173
```

## Access Points

| Service         | URL                       | Type       |
| --------------- | ------------------------- | ---------- |
| **Frontend**    | http://localhost:5173     | React/Vite |
| **Backend API** | http://localhost:3000/api | Express.js |
| **PostgreSQL**  | localhost:5432            | Database   |

## Quick Start Guide

### 1. Start PostgreSQL Container

```bash
cd /Users/darknight/Developer/taskboard
docker-compose up
```

**Output:** PostgreSQL is ready to accept connections

### 2. Start Backend (new terminal)

```bash
cd /Users/darknight/Developer/taskboard/backend
npm run dev
```

**Output:** Server running on http://localhost:3000

### 3. Start Frontend (new terminal)

```bash
cd /Users/darknight/Developer/taskboard/frontend
npm run dev
```

**Output:** ➜ Local: http://localhost:5173/

### 4. Open Application

Visit **http://localhost:5173** in your browser

---

## Configuration Summary

### Backend (.env)

```env
DB_HOST=localhost      # Local PostgreSQL
DB_PORT=5432          # Docker PostgreSQL port
DB_NAME=taskboard
DB_USER=postgres
DB_PASSWORD=password
PORT=3000             # Backend server port
```

### Frontend (apiClient.js)

```javascript
const API_BASE_URL = "http://localhost:3000/api";
```

### Docker Compose (docker-compose.yml)

- PostgreSQL 15 Alpine
- Data persists in `postgres_data` volume
- Auto-initialized with `init_db.sql` schema
- Health checks enabled

---

## Useful Commands

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it taskboard-postgres psql -U postgres -d taskboard

# View tables
\dt

# Query data
SELECT * FROM users;
```

### Docker Management

```bash
# View logs
docker-compose logs -f postgres

# Stop (keeps data)
docker-compose down

# Stop and remove data
docker-compose down -v

# Restart
docker-compose restart postgres
```

### Development

- **Backend changes:** Auto-reload with nodemon
- **Frontend changes:** Auto-reload in browser
- **Database changes:** Edit `backend/init_db.sql`, restart Docker

---

## Test the Setup

```bash
# Register a user via API
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Check PostgreSQL
docker exec -it taskboard-postgres psql -U postgres -d taskboard -c "SELECT * FROM users;"
```

---

## Troubleshooting

| Problem                  | Solution                                                   |
| ------------------------ | ---------------------------------------------------------- |
| Port 3000 in use         | Change `PORT=3000` in `backend/.env`                       |
| PostgreSQL won't start   | `docker-compose down -v && docker-compose up`              |
| Frontend can't connect   | Check `frontend/src/lib/apiClient.js` has `localhost:3000` |
| Database not initialized | Restart Docker with `docker-compose down -v`               |

---

## Summary

✅ Docker PostgreSQL container is running  
✅ Backend server running on localhost:3000  
✅ Frontend development server available at localhost:5173  
✅ Database initialized and ready  
✅ Data persists across restarts  
✅ Hot reload enabled for development

**Ready to develop!** 🚀
