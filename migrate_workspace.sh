#!/bin/bash

echo "======================================"
echo "TaskTracker Workspace Migration Script"
echo "======================================"
echo ""

# Check if PostgreSQL container is running
if ! docker ps | grep -q "taskboard-postgres"; then
    echo "❌ PostgreSQL container is not running!"
    echo "Please start it with: docker-compose up -d"
    exit 1
fi

echo "✓ PostgreSQL container is running"
echo ""
echo "This script will migrate your database to support workspaces."
echo "A backup will be created before migration."
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Step 1: Creating database backup..."
BACKUP_FILE="taskboard_backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec taskboard-postgres pg_dump -U postgres taskboard > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Backup created: $BACKUP_FILE"
else
    echo "❌ Backup failed!"
    exit 1
fi

echo ""
echo "Step 2: Running migration script..."
docker exec -i taskboard-postgres psql -U postgres taskboard < backend/migrate_to_workspaces.sql

if [ $? -eq 0 ]; then
    echo "✓ Migration completed successfully!"
else
    echo "❌ Migration failed!"
    echo "You can restore from backup: cat $BACKUP_FILE | docker exec -i taskboard-postgres-1 psql -U postgres taskboard"
    exit 1
fi

echo ""
echo "Step 3: Restarting backend server..."
echo "Please restart your backend server (npm run dev in the backend folder)"
echo ""
echo "======================================"
echo "Migration Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Refresh your frontend"
echo "3. You should now see your boards in a default workspace"
echo ""
echo "Backup file saved at: $BACKUP_FILE"
