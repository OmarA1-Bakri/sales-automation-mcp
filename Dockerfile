# Multi-stage Dockerfile for RTGS Sales Automation
# Builds and runs Sales Automation API + Desktop app in container

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    postgresql-client \
    python3 \
    make \
    g++ \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy API server files
COPY sales-automation-api/package*.json ./sales-automation-api/
WORKDIR /app/sales-automation-api
RUN npm install

COPY sales-automation-api/ ./

# Copy desktop app files
WORKDIR /app/desktop-app
COPY desktop-app/package*.json ./
RUN npm install

COPY desktop-app/ ./

# Create data directory
RUN mkdir -p /app/.sales-automation

# Expose ports
# 3000 - Sales Automation API (HTTP)
# 3456 - Sales Automation API (alternate port)
# 5173 - Vite dev server (desktop app)
EXPOSE 3000 3456 5173

# Set working directory
WORKDIR /app

# Copy SSL certificates (will be generated in container if needed)
RUN mkdir -p /app/sales-automation-api/ssl

# Create startup script
RUN echo '#!/bin/bash\n\
echo "🚀 Starting RTGS Sales Automation Production Environment"\n\
echo ""\n\
\n\
# Generate SSL certificates if they do not exist and SSL is enabled\n\
if [ -n "$SSL_KEY_PATH" ] && [ -n "$SSL_CERT_PATH" ]; then\n\
  if [ ! -f /app/sales-automation-api/ssl/privkey.pem ]; then\n\
    echo "Generating self-signed SSL certificate..."\n\
    openssl req -x509 -newkey rsa:4096 -nodes \\\n\
      -keyout /app/sales-automation-api/ssl/privkey.pem \\\n\
      -out /app/sales-automation-api/ssl/fullchain.pem \\\n\
      -days 365 \\\n\
      -subj "/C=US/ST=State/L=City/O=SalesAutomation/CN=localhost"\n\
    chmod 600 /app/sales-automation-api/ssl/privkey.pem\n\
    chmod 644 /app/sales-automation-api/ssl/fullchain.pem\n\
    echo "✓ SSL certificate generated"\n\
    echo ""\n\
  fi\n\
fi\n\
\n\
echo "Starting Sales Automation API Server..."\n\
cd /app/sales-automation-api && npm start &\n\
API_PID=$!\n\
echo "API Server started with PID: $API_PID"\n\
echo ""\n\
echo "Waiting for API server to be ready..."\n\
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
echo "  - API Server: http://localhost:${PORT:-3000}"\n\
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
