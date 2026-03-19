#!/bin/bash
# Script to set up PostgreSQL for SwiftLogistics

# Create role and database as postgres system user
su - postgres << 'EOF'
psql << 'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sarvp-srk') THEN
    CREATE ROLE "sarvp-srk" SUPERUSER LOGIN;
  END IF;
END$$;
CREATE DATABASE swiftlogistics;
SQL
EOF

echo "PostgreSQL setup done"
