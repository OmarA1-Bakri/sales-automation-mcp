# Suggested Commands

## Installation & Setup

### One-Time Installation
```bash
./install.sh
```

### Environment Configuration
```bash
cp .env.example .env
# Edit .env with your API keys
```

## Running the Application

### Launch Desktop App (Full Stack)
```bash
./rtgs-sales-automation.sh
```
Starts both:
- API Server on port 3000
- Desktop App on port 5173

Access: http://localhost:5173

### Launch API Server Only
```bash
cd mcp-server
npm run api-server
```

### Launch API Server with YOLO Mode
```bash
cd mcp-server
npm run api-server:yolo
```

### Development Mode (API Server with auto-reload)
```bash
cd mcp-server
npm run api-server:dev
```

### Development Mode (Desktop App)
```bash
cd desktop-app
npm run dev
```

## Stopping Services

### Stop All Services
```bash
./stop.sh
```

## Testing

### Run All Tests
```bash
cd mcp-server
npm test
```

### Run Tests in Watch Mode
```bash
cd mcp-server
npm run test:watch
```

### Run Tests with Coverage
```bash
cd mcp-server
npm run test:coverage
```

### Integration Tests
```bash
cd mcp-server/tests/integration
node test-explorium.js
node test-full-pipeline.js
```

## Database Operations

### Run Migrations
```bash
cd mcp-server
npm run db:migrate
```

### Undo Last Migration
```bash
cd mcp-server
npm run db:migrate:undo
```

### Check Migration Status
```bash
cd mcp-server
npm run db:migrate:status
```

### Start PostgreSQL (Docker)
```bash
./start-postgres.sh
```

## Logging

### View MCP Server Logs
```bash
tail -f logs/mcp-server.log
```

### View Desktop App Logs
```bash
tail -f logs/desktop-app.log
```

## Building

### Build Desktop App (All Platforms)
```bash
cd desktop-app
npm run build
```

### Build for macOS
```bash
cd desktop-app
npm run build:mac
```

### Build for Windows
```bash
cd desktop-app
npm run build:win
```

### Build for Linux
```bash
cd desktop-app
npm run build:linux
```

## Docker

### Start with Docker Compose
```bash
docker-compose up -d
```

### Stop Docker Services
```bash
docker-compose down
```

## Common Development Tasks

### Install Dependencies (Root)
```bash
npm install
```

### Install Dependencies (MCP Server)
```bash
cd mcp-server
npm install
```

### Install Dependencies (Desktop App)
```bash
cd desktop-app
npm install
```

### Clean Node Modules
```bash
rm -rf node_modules mcp-server/node_modules desktop-app/node_modules
```

## System Utilities (Linux)

### File Operations
```bash
ls -la              # List files with details
find . -name "*.js" # Find JavaScript files
grep -r "pattern"   # Search for pattern recursively
```

### Git Operations
```bash
git status
git add .
git commit -m "message"
git push
```

### Process Management
```bash
ps aux | grep node  # Find Node.js processes
kill -9 <PID>       # Force kill process
```

## API Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Get System Stats
```bash
curl http://localhost:3000/api/monitor \
  -H "X-API-Key: your_api_secret_key"
```

### Chat with AI Assistant
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_secret_key" \
  -d '{"message": "What can you do?"}'
```