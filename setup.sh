#!/bin/bash

echo "🚀 TaskBoard Setup Script"
echo "======================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js is installed${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm is installed${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not in PATH${NC}"
    echo "   Please ensure PostgreSQL is installed and running"
else
    echo -e "${GREEN}✓ PostgreSQL is available${NC}"
fi

echo ""
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Ensure PostgreSQL is running"
echo "2. Initialize the database: psql -U postgres -d taskboard -f backend/init_db.sql"
echo "3. In one terminal, run: cd backend && npm run dev"
echo "4. In another terminal, run: cd frontend && npm run dev"
echo ""
echo "Default frontend URL: http://localhost:5173"
echo "Default backend URL: http://localhost:5000"
