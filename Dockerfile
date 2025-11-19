# Multi-stage Dockerfile for RTGS Sales Automation
# Builds and runs MCP server + Desktop app in container

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    sqlite3 \
    python3 \
    make \
    g++ \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy MCP server files
COPY mcp-server/package*.json ./mcp-server/
WORKDIR /app/mcp-server
RUN npm install

COPY mcp-server/ ./

# Copy desktop app files
WORKDIR /app/desktop-app
COPY desktop-app/package*.json ./
RUN npm install

COPY desktop-app/ ./

# Create data directory for SQLite
RUN mkdir -p /app/.sales-automation

# Expose ports
# 3456 - MCP API Server HTTP (redirects to HTTPS)
# 3457 - MCP API Server HTTPS
# 5173 - Vite dev server (desktop app)
EXPOSE 3456 3457 5173

# Set working directory
WORKDIR /app

# Copy SSL certificates (will be generated in container)
RUN mkdir -p /app/mcp-server/ssl

# Create startup script
RUN echo '#!/bin/bash\n\
echo "🚀 Starting RTGS Sales Automation Production Environment"\n\
echo ""\n\
\n\
# Generate SSL certificates if they do not exist\n\
if [ ! -f /app/mcp-server/ssl/privkey.pem ]; then\n\
  echo "Generating self-signed SSL certificate..."\n\
  openssl req -x509 -newkey rsa:4096 -nodes \\\n\
    -keyout /app/mcp-server/ssl/privkey.pem \\\n\
    -out /app/mcp-server/ssl/fullchain.pem \\\n\
    -days 365 \\\n\
    -subj "/C=US/ST=State/L=City/O=SalesAutomation/CN=localhost"\n\
  chmod 600 /app/mcp-server/ssl/privkey.pem\n\
  chmod 644 /app/mcp-server/ssl/fullchain.pem\n\
  echo "✓ SSL certificate generated"\n\
  echo ""\n\
fi\n\
\n\
echo "Starting MCP Server (HTTP: 3456, HTTPS: 3457)..."\n\
cd /app/mcp-server && node src/api-server.js --port=3456 &\n\
MCP_PID=$!\n\
echo "MCP Server started with PID: $MCP_PID"\n\
echo ""\n\
echo "Waiting for MCP server to be ready..."\n\
sleep 5\n\
echo ""\n\
echo "Starting Desktop App Dev Server on port 5173..."\n\
cd /app/desktop-app && npm run dev:vite &\n\
VITE_PID=$!\n\
echo "Vite server started with PID: $VITE_PID"\n\
echo ""\n\
echo "✅ All services started!"\n\
echo ""\n\
echo "Access points:"\n\
echo "  - MCP Server HTTP: http://localhost:3456 (redirects to HTTPS)"\n\
echo "  - MCP Server HTTPS: https://localhost:3457"\n\
echo "  - Desktop App UI: http://localhost:5173"\n\
echo ""\n\
echo "Press Ctrl+C to stop all services"\n\
echo ""\n\
\n\
# Wait for any process to exit\n\
wait -n\n\
\n\
# Exit with status of process that exited first\n\
exit $?\n\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
