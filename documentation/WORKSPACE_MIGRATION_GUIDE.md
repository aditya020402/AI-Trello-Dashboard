# Workspace Migration Guide

## Overview

TaskTracker now supports **multiple workspaces**! Each workspace can contain multiple boards, and you can organize your projects by workspace.

## What's New

### Features

- ✅ **Multiple Workspaces**: Create unlimited workspaces to organize your boards
- ✅ **Workspace Sidebar**: Expandable workspace navigation with:
  - **Boards**: View and manage all boards in the workspace
  - **Activity**: Workspace-specific activity feed
  - **Settings**: Workspace settings (coming soon)
  - **Billing**: Billing information (coming soon)
- ✅ **Board Organization**: Each board now belongs to a specific workspace
- ✅ **Activity Tracking**: View activity per workspace or per board

### UI Changes

- Sidebar now shows workspaces instead of individual boards
- Each workspace can be expanded to show Boards, Activity, Settings, and Billing
- Activity view redesigned to match modern design patterns
- Create workspace button in sidebar header

## Migration Steps

### 1. Stop Your Servers

```bash
# Stop frontend and backend if running
# Press Ctrl+C in both terminals
```

### 2. Run Migration Script

```bash
cd /Users/darknight/Developer/taskboard
./migrate_workspace.sh
```

This script will:

- ✅ Create a backup of your database
- ✅ Add workspace tables
- ✅ Create a default workspace for each user
- ✅ Migrate all existing boards to user workspaces

### 3. Restart Backend

```bash
cd backend
npm run dev
```

### 4. Restart Frontend

```bash
cd frontend
npm run dev
```

### 5. Verify Migration

1. Open http://localhost:5173
2. Log in with your existing credentials
3. You should see your boards in "{username}'s Workspace"
4. Try creating a new workspace using the "+" button next to "Workspaces"

## Database Changes

### New Tables

- **workspaces**: Stores workspace information
- **workspace_members**: Manages workspace access and roles

### Modified Tables

- **boards**: Now references `workspace_id` instead of `user_id`
- **activity_logs**: Added `workspace_id` field

### Migration Safety

- Your data is backed up before migration
- All existing boards are preserved
- A default workspace is created for each user
- All boards are automatically moved to user's default workspace

## Troubleshooting

### Migration Failed

If migration fails, restore from backup:

```bash
cat taskboard_backup_YYYYMMDD_HHMMSS.sql | docker exec -i taskboard-postgres-1 psql -U postgres taskboard
```

### Backend Errors

If you see workspace-related errors:

1. Check that migration completed successfully
2. Verify all boards have workspace_id: `docker exec -i taskboard-postgres-1 psql -U postgres taskboard -c "SELECT id, title, workspace_id FROM boards;"`
3. Check backend logs for specific errors

### Frontend Issues

If workspaces don't appear:

1. Clear browser cache
2. Check browser console for errors
3. Verify backend is running and accessible
4. Check that workspaces exist: Visit http://localhost:3000/api/workspaces (should return JSON array)

## API Changes

### Boards Endpoint

- **Before**: `GET /api/boards` - Returns user's boards
- **After**: `GET /api/boards?workspaceId=123` - Returns workspace boards

- **Before**: `POST /api/boards` - Create board for user
- **After**: `POST /api/boards` - Create board (requires `workspaceId` in body)

### New Endpoints

- `GET /api/workspaces` - Get user's workspaces
- `POST /api/workspaces` - Create new workspace
- `PATCH /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

### Activity Endpoint

- **New**: `GET /api/activity?workspaceId=123` - Get workspace activity
- **Existing**: `GET /api/activity?boardId=123` - Get board activity

## Manual Rollback (If Needed)

If you need to rollback to the old version:

```bash
# 1. Restore database from backup
cat taskboard_backup_YYYYMMDD_HHMMSS.sql | docker exec -i taskboard-postgres-1 psql -U postgres taskboard

# 2. Restore old frontend code
cd frontend/src/pages
mv DashboardPage.jsx DashboardPage_NEW.jsx
mv DashboardPage_OLD.jsx DashboardPage.jsx

# 3. Restart servers
```

## Support

If you encounter any issues:

1. Check the backup file was created
2. Review migration script output
3. Check backend/frontend logs
4. Verify database schema matches expected structure

## Next Steps

After successful migration:

1. Create additional workspaces for different projects
2. Organize your boards into appropriate workspaces
3. Invite team members to workspaces (coming soon)
4. Explore workspace settings and billing options
