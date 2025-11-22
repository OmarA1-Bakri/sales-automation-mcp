# Docker Deployment Guide

Complete guide for deploying RTGS Sales Automation using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB free disk space
- Required API keys (see `.env.example`)

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys. **Required keys:**
- `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` (at least one AI provider)
- `HUBSPOT_API_KEY` (for CRM integration)
- `LEMLIST_API_KEY` or `POSTMARK_API_KEY` (for email outreach)

See `.env.example` for complete documentation of all available options.

### 2. Start All Services

```bash
# Start in detached mode
docker-compose up -d

# Or start with logs visible
docker-compose up
```

This will start:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Sales Automation API** on port 3000
- **Desktop App UI** on port 5173

### 3. Access the Application

- **API Server**: http://localhost:3000
- **Desktop App**: http://localhost:5173
- **Health Check**: http://localhost:3000/health

## Services

### Sales Automation API

Main API server handling:
- B-mad workflow orchestration
- HubSpot, Lemlist, Explorium integrations
- WebSocket real-time updates
- RESTful API endpoints

**Ports**: 3000, 3456

### PostgreSQL

Production-grade database for:
- Workflow states and history
- Contact enrichment data
- Campaign tracking
- Audit logs

**Port**: 5432
**Credentials** (development):
- Database: `rtgs_sales_automation`
- User: `rtgs_user`
- Password: `rtgs_password_dev`

### Redis

High-performance caching and rate limiting:
- API rate limiting
- Session storage
- Real-time data caching

**Port**: 6379
**Password**: Set via `REDIS_PASSWORD` env var (optional)

### Desktop App

Electron-based UI for local development.

**Port**: 5173

## Common Commands

### Start Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres redis

# Start and rebuild
docker-compose up -d --build
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f rtgs-sales-automation
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 rtgs-sales-automation
```

### Execute Commands in Container

```bash
# Access API server shell
docker-compose exec rtgs-sales-automation sh

# Run npm commands
docker-compose exec rtgs-sales-automation npm run test

# Access PostgreSQL
docker-compose exec postgres psql -U rtgs_user -d rtgs_sales_automation

# Access Redis CLI
docker-compose exec redis redis-cli
```

### Database Operations

```bash
# Create database backup
docker-compose exec postgres pg_dump -U rtgs_user rtgs_sales_automation > backup.sql

# Restore database backup
docker-compose exec -T postgres psql -U rtgs_user rtgs_sales_automation < backup.sql

# View database tables
docker-compose exec postgres psql -U rtgs_user -d rtgs_sales_automation -c '\dt'
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart rtgs-sales-automation
```

## Configuration

### Environment Variables

All configuration is done through environment variables in `.env` file.

**Categories:**
1. **AI Providers** - Anthropic Claude or Google Gemini
2. **CRM** - HubSpot integration
3. **Email/Outreach** - Lemlist or Postmark
4. **LinkedIn** - PhantomBuster or manual session
5. **Enrichment** - Explorium, Apollo.io
6. **Video** - HeyGen
7. **Database** - PostgreSQL connection
8. **Redis** - Cache configuration
9. **Rate Limiting** - API protection
10. **SSL/HTTPS** - Certificate paths

See `.env.example` for complete documentation.

### Ports

Default ports can be overridden in `.env`:

```bash
PORT=3000                  # API server port
API_SERVER_PORT=3000       # Alternative API port
POSTGRES_PORT=5432         # PostgreSQL
REDIS_PORT=6379            # Redis
```

### Volumes

Persistent data is stored in Docker volumes:

- `sales-data` - Application data
- `postgres-data` - Database files
- `redis-data` - Redis persistence

**Location**: `/var/lib/docker/volumes/` (on host)

## Production Deployment

### Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Set strong `REDIS_PASSWORD`
- [ ] Configure `API_SECRET_KEY` (generate with `openssl rand -hex 32`)
- [ ] Set `API_KEYS` for API authentication
- [ ] Enable SSL/HTTPS with valid certificates
- [ ] Configure firewall rules
- [ ] Set `NODE_ENV=production`
- [ ] Review and adjust rate limits

### SSL/HTTPS Setup

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Mount certificates in `docker-compose.yml`:

```yaml
volumes:
  - /path/to/certs:/app/sales-automation-api/ssl:ro
```

3. Set environment variables:

```bash
SSL_KEY_PATH=/app/sales-automation-api/ssl/privkey.pem
SSL_CERT_PATH=/app/sales-automation-api/ssl/fullchain.pem
```

### Production docker-compose.yml

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  rtgs-sales-automation:
    restart: always
    environment:
      - NODE_ENV=production
    # ... other settings

  postgres:
    restart: always
    # Production settings

  redis:
    restart: always
    # Production settings
```

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs rtgs-sales-automation

# Check container status
docker-compose ps

# Rebuild and restart
docker-compose up -d --build --force-recreate
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U rtgs_user
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# With password
docker-compose exec redis redis-cli -a YOUR_PASSWORD ping
```

### Out of Memory

Increase Docker memory limit:
- Docker Desktop: Settings → Resources → Memory (4GB+ recommended)
- Linux: Adjust Docker daemon settings

### Port Already in Use

Change ports in `.env`:

```bash
PORT=3001                  # Use different port
POSTGRES_PORT=5433         # Use different port
```

### Clean Start

Remove all containers and volumes:

```bash
docker-compose down -v
docker-compose up -d --build
```

## Monitoring

### Health Checks

Built-in health checks for all services:

```bash
# Check all services
docker-compose ps

# API health endpoint
curl http://localhost:3000/health

# Database health
docker-compose exec postgres pg_isready -U rtgs_user

# Redis health
docker-compose exec redis redis-cli ping
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Development

### Live Reload

Source code is mounted as volumes for live development:

- `./sales-automation-api` → `/app/sales-automation-api`
- `./desktop-app` → `/app/desktop-app`

Changes to source files will trigger auto-reload.

### Running Tests

```bash
# Run all tests
docker-compose exec rtgs-sales-automation npm test

# Run specific test file
docker-compose exec rtgs-sales-automation npm test -- path/to/test.js

# Run with coverage
docker-compose exec rtgs-sales-automation npm run test:coverage
```

## Backup and Restore

### Full Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U rtgs_user rtgs_sales_automation > backup-$(date +%Y%m%d).sql

# Backup Redis (if persistence enabled)
docker-compose exec redis redis-cli BGSAVE
docker cp rtgs-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb

# Backup volumes
docker run --rm -v claude-sales_auto_skill_sales-data:/data -v $(pwd):/backup alpine tar czf /backup/sales-data-backup.tar.gz /data
```

### Restore

```bash
# Restore database
docker-compose exec -T postgres psql -U rtgs_user rtgs_sales_automation < backup-20250122.sql

# Restore Redis
docker cp redis-backup-20250122.rdb rtgs-redis:/data/dump.rdb
docker-compose restart redis
```

## Migration from Non-Docker Setup

1. **Backup existing data**:
   ```bash
   # Export PostgreSQL data
   pg_dump -U rtgs_user rtgs_sales_automation > migration-backup.sql
   ```

2. **Update configuration**:
   ```bash
   cp .env .env.backup
   # Update database host to 'postgres' instead of 'localhost'
   ```

3. **Start Docker services**:
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Import data**:
   ```bash
   docker-compose exec -T postgres psql -U rtgs_user rtgs_sales_automation < migration-backup.sql
   ```

5. **Start application**:
   ```bash
   docker-compose up -d
   ```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review `.env.example` for configuration options
- Consult main README.md
- Check ARCHITECTURE.md for system design

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
