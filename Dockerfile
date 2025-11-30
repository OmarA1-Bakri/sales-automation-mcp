# Dockerfile for RTGS Sales Automation API Server
# Desktop app runs natively on host (Electron needs display access)

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

# Create data directory
RUN mkdir -p /app/.sales-automation

# Expose API ports only
# 3000 - Sales Automation API (HTTP)
# 3456 - Sales Automation API (alternate port)
EXPOSE 3000 3456

# Set working directory
WORKDIR /app/sales-automation-api

# Copy SSL certificates directory (will be generated if needed)
RUN mkdir -p /app/sales-automation-api/ssl

# Default command - just run the API server
CMD ["npm", "start"]
