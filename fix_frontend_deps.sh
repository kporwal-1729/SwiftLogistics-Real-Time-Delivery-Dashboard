#!/bin/bash
# Run this ONCE to fix the node_modules platform mismatch
# (Windows npm installed Windows binaries; this installs Linux ones)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20
cd /home/sarvp-srk/logistic_delivery_dashboard/frontend
rm -rf node_modules package-lock.json
npm install --registry https://registry.npmjs.org/
echo "All done — run 'npm run dev' from the frontend folder"
