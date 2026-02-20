#!/bin/bash

# Add user profile fields migration
# This script adds profile_photo_url, status, and bio fields to the users table

PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d taskboard -f backend/add_user_profile.sql

if [ $? -eq 0 ]; then
  echo "✓ Successfully added profile fields to users table"
else
  echo "✗ Failed to add profile fields"
  exit 1
fi
