# MCP Server Development & Deployment Guide

Guide for developers and operators to run and manage the Taskboard MCP Server.

## Development Environment

### Prerequisites

- Node.js 16+
- npm or yarn
- Taskboard backend API running on `http://localhost:3000`
- Valid JWT authentication token

### Local Development Setup

```bash
# 1. Navigate to MCP server directory
cd mcp-server

# 2. Install dependencies
npm install

# 3. Create .env for local development
cat > .env << EOF
TASKBOARD_API_URL=http://localhost:3000/api
TASKBOARD_AUTH_TOKEN=your_dev_token_here
NODE_ENV=development
EOF

# 4. Start development server
npm start
```

### Development Mode with Logging

```bash
# Enhanced logging for debugging
DEBUG=* npm start

# Or with specific module logging
DEBUG=taskboard:* npm start
```

## Testing

### Manual Testing

```bash
# Terminal 1: Start the MCP server
npm start

# Terminal 2: Test with curl (if using TCP transport)
curl -X POST http://localhost:3001/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### Integration Testing

```bash
# Test that the server connects to the API
npm test

# Run specific test suite
npm test -- test/integration.js

# With coverage
npm test -- --coverage
```

### Health Check

```bash
# Verify API connectivity
curl http://localhost:3000/api/health \
  -H "Authorization: Bearer $TASKBOARD_AUTH_TOKEN"
```

## Production Deployment

### Environment Setup

For production, create a `.env.production` file:

```env
# Production API endpoint
TASKBOARD_API_URL=https://api.example.com/api
TASKBOARD_AUTH_TOKEN=production_token_here

# Server configuration
NODE_ENV=production
PORT=3001

# Logging
LOG_LEVEL=info

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker Deployment

**Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application
COPY server.js .

# Runtime environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) process.exit(1)})"

# Start server
CMD ["node", "server.js"]
```

**Build and run:**

```bash
# Build image
docker build -t taskboard-mcp:latest .

# Run container
docker run \
  --name taskboard-mcp \
  -e TASKBOARD_API_URL=http://api:3000/api \
  -e TASKBOARD_AUTH_TOKEN=$AUTH_TOKEN \
  -p 3001:3001 \
  taskboard-mcp:latest

# View logs
docker logs taskboard-mcp

# Stop container
docker stop taskboard-mcp
docker rm taskboard-mcp
```

### Docker Compose

**docker-compose.yml:**

```yaml
version: "3.8"

services:
  mcp-server:
    build: ./mcp-server
    container_name: taskboard-mcp
    environment:
      TASKBOARD_API_URL: http://backend:3000/api
      TASKBOARD_AUTH_TOKEN: ${TASKBOARD_AUTH_TOKEN}
      NODE_ENV: production
    ports:
      - "3001:3001"
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - taskboard

  backend:
    image: taskboard-backend:latest
    container_name: taskboard-api
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/taskboard
    networks:
      - taskboard

networks:
  taskboard:
    driver: bridge
```

Run with:

```bash
docker-compose up -d
```

### Kubernetes Deployment

**deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: taskboard-mcp-server
  labels:
    app: taskboard-mcp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: taskboard-mcp
  template:
    metadata:
      labels:
        app: taskboard-mcp
    spec:
      containers:
        - name: mcp-server
          image: taskboard-mcp:latest
          ports:
            - containerPort: 3001
          env:
            - name: TASKBOARD_API_URL
              value: "http://taskboard-backend:3000/api"
            - name: TASKBOARD_AUTH_TOKEN
              valueFrom:
                secretKeyRef:
                  name: taskboard-secrets
                  key: mcp-token
            - name: NODE_ENV
              value: "production"
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: taskboard-mcp-service
spec:
  selector:
    app: taskboard-mcp
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3001
  type: ClusterIP
```

Deploy with:

```bash
kubectl apply -f deployment.yaml
kubectl get pods -l app=taskboard-mcp
kubectl logs -l app=taskboard-mcp
```

## Monitoring & Logging

### Log Levels

```env
# Development - very detailed
LOG_LEVEL=debug

# Production - important events only
LOG_LEVEL=info

# Minimal logging
LOG_LEVEL=error
```

### Monitoring Health

```bash
# Check if server is running
curl http://localhost:3001/health

# Monitor API connectivity
watch -n 5 'curl -s http://localhost:3001/health | jq'
```

### Error Tracking

The server logs all errors to stderr. In production, pipe to a logging service:

```bash
npm start 2>&1 | tee logs/mcp-server.log
```

Or use systemd journal:

```bash
journalctl -u taskboard-mcp -f
```

## Performance Tuning

### Node.js Optimization

```bash
# Increase file descriptor limit
ulimit -n 4096

# Enable cluster mode for multi-core systems
NODE_CLUSTER_SIZE=4 npm start
```

### Environment Variables for Performance

```env
# Cache settings
CACHE_TTL=300
REDIS_CACHE_ENABLED=true

# Connection pooling
DB_POOL_MIN=5
DB_POOL_MAX=20

# Request timeout
API_REQUEST_TIMEOUT=30000
```

## Troubleshooting

### Server Won't Start

```bash
# Check logs
npm start 2>&1 | grep -i error

# Verify port is available
lsof -i :3001

# Test environment
node -e "require('dotenv').config(); console.log(process.env)"
```

### Connection Issues

```bash
# Test API connectivity
curl -H "Authorization: Bearer $TASKBOARD_AUTH_TOKEN" \
  http://localhost:3000/api/health

# Check firewall
netstat -an | grep 3001
```

### Memory Leaks

```bash
# Monitor memory usage
node --max-old-space-size=2048 server.js

# Enable heap snapshots
NODE_HEAPSNAPSHOT=1 npm start
```

## Backup & Recovery

### Exporting Configuration

```bash
# Export current config
env | grep TASKBOARD_ > backup.env

# Backup auth tokens securely
gpg --symmetric backup.env
```

### Restoring from Backup

```bash
# Decrypt backup
gpg --decrypt backup.env.gpg > .env

# Restart service
systemctl restart taskboard-mcp
```

## Secure Deployment Checklist

- [ ] Use HTTPS for all API endpoints
- [ ] Rotate authentication tokens regularly
- [ ] Run server as non-root user
- [ ] Enable firewall rules
- [ ] Use environment variables for secrets (never in code)
- [ ] Set up monitoring and alerting
- [ ] Regular security updates for Node.js
- [ ] Enable request rate limiting
- [ ] Log all tool invocations for audit
- [ ] Use VPN/private network for server-to-API communication

## Systemd Service (Linux)

**File: `/etc/systemd/system/taskboard-mcp.service`**

```ini
[Unit]
Description=Taskboard MCP Server
After=network.target

[Service]
Type=simple
User=taskboard
WorkingDirectory=/opt/taskboard/mcp-server
EnvironmentFile=/opt/taskboard/mcp-server/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable taskboard-mcp
sudo systemctl start taskboard-mcp
sudo systemctl status taskboard-mcp
```

---

For more information:

- [README.md](./README.md) - API Reference
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Initial Setup
- [QUICKSTART.md](./QUICKSTART.md) - Quick Start
- [EXAMPLES.md](./EXAMPLES.md) - Usage Examples
