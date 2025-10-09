#!/bin/bash
# Production startup script for Render deployment

# Set NODE_PATH to include root node_modules
export NODE_PATH=/opt/render/project/src/node_modules

# Change to server directory
cd /opt/render/project/src/server

# Start the server
node index.js
