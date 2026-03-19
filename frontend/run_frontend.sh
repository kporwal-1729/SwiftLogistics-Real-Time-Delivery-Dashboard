#!/bin/bash
# SwiftLogistics Frontend Dev Server
# Run: bash run_frontend.sh

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20

NODE_BIN="$NVM_DIR/versions/node/v20.20.1/bin/node"
VITE_BIN="$(pwd)/node_modules/vite/bin/vite.js"

echo "Starting Vite with: $NODE_BIN"
exec "$NODE_BIN" "$VITE_BIN"
