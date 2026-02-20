# 🚀 TaskBoard - Quick Reference Commands

## 📦 Installation

```bash
# Create and initialize database
createdb taskboard
psql -U postgres -d taskboard -f backend/init_db.sql

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd frontend
npm install
```

## ▶️ Running the Application

### Start Backend (Terminal 1)

```bash
cd /Users/darknight/Developer/taskboard/backend
npm run dev
```

- Runs on: http://localhost:5000
- Auto-reloads on file changes
- Database: localhost:5432

### Start Frontend (Terminal 2)

```bash
cd /Users/darknight/Developer/taskboard/frontend
npm run dev
```

- Runs on: http://localhost:5173
- Auto-reloads on file changes
- Opens browser automatically

### Build for Production

```bash
# Frontend
cd frontend
npm run build
# Output: frontend/dist/

# Backend
# Just run with npm start (requires .env configured)
cd backend
npm start
```

## 🔧 Configuration

### Backend Environment (.env)

```bash
cd backend
# Edit .env file
nano .env
```

**Key settings:**

```
PORT=5000
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_NAME=taskboard
JWT_SECRET=your-secret-key-change-in-production
```

### Frontend Environment (.env)

```bash
cd frontend
# Usually auto-configured, backend must run on http://localhost:5000
VITE_API_URL=http://localhost:5000/api
```

## 🗄️ Database Commands

### Create Database

```bash
createdb taskboard
```

### Initialize Schema

```bash
psql -U postgres -d taskboard -f backend/init_db.sql
```

### Connect to Database (for debugging)

```bash
psql -U postgres -d taskboard
```

### Useful SQL Commands

```sql
-- List all tables
\dt

-- Show specific table
\d users

-- Count records
SELECT COUNT(*) FROM boards;

-- Reset/clear table
TRUNCATE users CASCADE;

-- Exit psql
\q
```

### Reset Database

```bash
# Drop and recreate
dropdb taskboard
createdb taskboard
psql -U postgres -d taskboard -f backend/init_db.sql
```

## 🐛 Debugging

### Check if Backend is Running

```bash
curl http://localhost:5000/health
# Should return: {"status":"OK","message":"Server is running"}
```

### Check if PostgreSQL is Running

```bash
psql -U postgres -c "SELECT 1"
# Should return: 1
```

### View Backend Logs

- Check terminal where backend is running
- Look for console.log output
- Check database query logs

### View Frontend Errors

- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for API calls

### Clear Cache

```bash
# Browser - DevTools > Storage > Clear All
# Or reload with Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# Local Storage (manual)
# Open DevTools > Console and run:
localStorage.clear()
sessionStorage.clear()
```

## 📝 Common Tasks

### View All User Accounts

```bash
psql -U postgres -d taskboard
SELECT id, username, email, created_at FROM users;
```

### View All Boards

```bash
psql -U postgres -d taskboard
SELECT id, user_id, title, created_at FROM boards;
```

### Delete Specific User (and all their data)

```bash
psql -U postgres -d taskboard
DELETE FROM users WHERE id = 1;
-- Note: Cascade delete will remove all their boards
```

### View Activity Log

```bash
psql -U postgres -d taskboard
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20;
```

### Reset to Clean State

```bash
dropdb taskboard
createdb taskboard
psql -U postgres -d taskboard -f backend/init_db.sql

# Frontend: localStorage also cleared on next login
```

## 🔒 Password Reset (Manual)

```bash
# In psql
psql -U postgres -d taskboard

# Generate new password hash using Node.js
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('newpassword', 10).then(hash => console.log(hash));"

# Update user password
UPDATE users SET password_hash = 'paste_the_hash_here' WHERE username = 'username';
```

## 🚨 Troubleshooting Commands

### Kill Process on Port 5000

```bash
# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Kill Process on Port 5173

```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Reinstall Dependencies

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Check Node Version

```bash
node --version
npm --version
# Should be Node 16+ and npm 8+
```

### Check PostgreSQL Version

```bash
psql --version
# Should be 12+
```

## 📊 Database Backup & Restore

### Backup Database

```bash
pg_dump -U postgres -d taskboard > /path/to/backup.sql
```

### Restore Database

```bash
createdb taskboard
psql -U postgres -d taskboard -f /path/to/backup.sql
```

## 🌐 API Testing

### Test Registration

```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Test Login

```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Test Protected Route (with JWT)

```bash
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get All Boards (with JWT)

```bash
curl -X GET http://localhost:5000/api/boards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📦 Useful npm Commands

### Backend

```bash
npm start          # Production mode
npm run dev        # Development mode with auto-reload
npm install pkg    # Install new package
npm uninstall pkg  # Remove package
npm audit          # Check security issues
npm update         # Update packages
```

### Frontend

```bash
npm run dev        # Start dev server
npm run build      # Create production build
npm run preview    # Preview production build locally
npm install pkg    # Install new package
npm update         # Update packages
```

## 🎯 Performance Optimization

### Check Bundle Size

```bash
cd frontend
npm run build
# Check file sizes in dist/
```

### Analyze PostgreSQL Queries

```bash
# Enable query logging in psql
\timing on

# Run a query
SELECT * FROM boards WHERE user_id = 1;

# See execution time
```

## 🔄 Deployment Preparation

### Build Frontend

```bash
cd frontend
npm run build
# Creates dist/ folder with optimized files
```

### Environment Setup

```bash
# Copy example to .env
cp backend/.env.example backend/.env

# Edit with production values
nano backend/.env
```

### Database Connection String

```
postgres://user:password@host:port/dbname
```

## 📱 Development Tools

### VS Code Extensions Recommended

```
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Thunder Client (API testing)
- PostgreSQL Explorer
```

### Browser DevTools

```
- React Developer Tools (Chrome/Firefox extension)
- Redux DevTools (if implementing Redux)
```

## ✅ Pre-launch Checklist

- [ ] PostgreSQL running
- [ ] Database initialized
- [ ] Backend .env configured
- [ ] Backend running (npm run dev)
- [ ] Frontend running (npm run dev)
- [ ] Can access http://localhost:5173
- [ ] Can register account
- [ ] Can login
- [ ] Can create board
- [ ] Can create list
- [ ] Can create card
- [ ] Can drag card
- [ ] Activity log works
- [ ] Logout works

## 🚀 Next Steps

1. Follow SETUP_GUIDE.md for initial setup
2. Read DEVELOPER_GUIDE.md to understand architecture
3. Check ARCHITECTURE.md for system design
4. Explore the code in src/ directories
5. Customize colors and branding
6. Add additional features as needed

---

**Questions?** Check the documentation files in root directory.
**Need help?** Review the code comments and error messages.
