#!/bin/bash
# =========================================================
# SwiftLogistics – One-Shot Startup Script
# Run this from: logistic_delivery_dashboard/
# Usage: bash start.sh
# =========================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[SwiftLogistics]${NC} $1"; }
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# ─── Step 1: PostgreSQL ──────────────────────────────────
log "Setting up PostgreSQL..."

# Check if swiftlogistics DB exists via postgres user
if sudo -u postgres psql -lqt 2>/dev/null | cut -d\| -f1 | grep -qw swiftlogistics; then
    ok "Database 'swiftlogistics' already exists"
else
    log "Creating database and roles..."
    sudo -u postgres psql << 'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sarvp-srk') THEN
    CREATE ROLE "sarvp-srk" SUPERUSER LOGIN;
  END IF;
END $$;
SQL
    sudo -u postgres createdb -O "sarvp-srk" swiftlogistics 2>/dev/null || true
    ok "Database 'swiftlogistics' created"
fi

# ─── Step 2: Backend venv ────────────────────────────────
log "Checking Python venv..."
if [ ! -d "$BACKEND_DIR/venv" ]; then
    python3 -m venv "$BACKEND_DIR/venv"
    ok "venv created"
fi
source "$BACKEND_DIR/venv/bin/activate"

log "Installing Python dependencies..."
pip install -q -r "$BACKEND_DIR/requirements.txt"
ok "Python deps ready"

# ─── Step 3: Seed DB ─────────────────────────────────────
log "Seeding database..."
cd "$BACKEND_DIR"

# Update .env to use unix socket peer auth style URL
if grep -q 'postgresql+asyncpg://postgres:postgres' .env; then
    # Replace with OS user connection (no password = peer auth)
    sed -i "s|postgresql+asyncpg://postgres:postgres@localhost:5432/swiftlogistics|postgresql+asyncpg:///swiftlogistics|g" .env
    sed -i "s|postgresql://postgres:postgres@localhost:5432/swiftlogistics|postgresql:///swiftlogistics|g" .env
    ok ".env updated to use unix socket connection"
fi

python seed.py && ok "Database seeded" || warn "Seed failed (may already be seeded)"

# ─── Step 4: Redis ──────────────────────────────────────
log "Checking Redis..."
if redis-cli ping 2>/dev/null | grep -q PONG; then
    ok "Redis is running"
else
    warn "Redis not running! Starting..."
    redis-server --daemonize yes 2>/dev/null || warn "Could not auto-start Redis. Please run: redis-server"
fi

# ─── Step 5: Start Backend ──────────────────────────────
log "Starting FastAPI backend on port 8000..."
cd "$BACKEND_DIR"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
ok "Backend started (PID $BACKEND_PID)"

# ─── Step 6: Start Frontend ──────────────────────────────
log "Starting React frontend on port 5173..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
ok "Frontend started (PID $FRONTEND_PID)"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  🚀 SwiftLogistics is running!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "  Frontend:  ${CYAN}http://localhost:5173${NC}"
echo -e "  Backend:   ${CYAN}http://localhost:8000${NC}"
echo -e "  API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
echo -e ""
echo -e "  Admin:     admin@swift.com    / admin123"
echo -e "  Customer:  customer@swift.com / customer123"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both servers
wait $BACKEND_PID $FRONTEND_PID
