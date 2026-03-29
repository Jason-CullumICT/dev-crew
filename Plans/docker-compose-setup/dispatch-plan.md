# Dispatch Plan: Create Dockerfiles and docker-compose.yml

**Task:** Create Docker infrastructure files for the dev-crew unified repo
**Scope:** `backend-only` (infrastructure files only, no frontend components)
**Risk Level:** medium (new feature, 5 new files, Docker infrastructure)
**Confidence:** high

---

## Analysis

The task is to create 5 new files per the plan in `docs/superpowers/plans/2026-03-28-dev-crew-repo-merge.md` Task 3:

1. `platform/Dockerfile.orchestrator` — Node.js orchestrator image, build context = repo root
2. `platform/Dockerfile.worker` — Ubuntu worker image, build context = repo root
3. `portal/Dockerfile` — Node.js portal image, build context = portal/
4. `platform/.env.example` — Environment variable template
5. `platform/docker-compose.yml` — Compose file with 4 services + volumes + network

### Key observations from codebase:
- `platform/orchestrator/` and `platform/scripts/` already exist (copied from claude-ai-OS)
- `portal/Backend/` and `portal/Frontend/` already exist (copied from container-test)
- Portal backend uses `tsx` (see `portal/Backend/package.json` scripts: `"dev": "tsx watch src/index.ts"`)
- Portal has a `Shared/` directory that should also be copied in the Dockerfile
- `platform/nginx.conf` already exists for the dashboard service
- `templates/` directory exists for worker template scaffolding

---

## Fixer Agents

### backend-fixer-1

**Scope:** Create all 5 Docker infrastructure files

**Files to create:**
1. `platform/Dockerfile.orchestrator`
2. `platform/Dockerfile.worker`
3. `portal/Dockerfile`
4. `platform/.env.example`
5. `platform/docker-compose.yml`

**Instructions:**

Read the plan at `docs/superpowers/plans/2026-03-28-dev-crew-repo-merge.md`, Task 3 (starting at line 176). Create each file exactly as specified, with this one correction:

**portal/Dockerfile CMD fix:** The plan notes that the portal backend uses TypeScript. Checking `portal/Backend/package.json`, the dev script is `tsx watch src/index.ts`. The CMD in `portal/Dockerfile` must use `npx tsx src/index.ts` instead of `node src/index.ts`:

```dockerfile
CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & cd /app/Frontend && npx vite --host 0.0.0.0 --port 5173 & wait"]
```

Also ensure the portal Dockerfile copies the `Shared/` directory if it exists:
```dockerfile
COPY Shared/package.json Shared/package-lock.json* ./Shared/
RUN cd Shared && npm install 2>/dev/null || true

# Copy all source
COPY . .
```

**Exact file contents (from the plan, with corrections applied):**

#### 1. `platform/Dockerfile.orchestrator`
```dockerfile
########################################################################
# Orchestrator — API server that routes work to Claude Code workers
########################################################################
FROM node:22-slim

ENV CLAUDE_NONINTERACTIVE=1

RUN apt-get update && apt-get install -y \
    curl git jq python3 \
    && rm -rf /var/lib/apt/lists/*

# Claude Code (for direct session execution)
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

# Install orchestrator deps
COPY platform/orchestrator/package.json platform/orchestrator/package-lock.json* ./
RUN npm install --production

# Copy orchestrator code
COPY platform/orchestrator/ ./
COPY platform/scripts/ /app/scripts/
RUN chmod +x /app/scripts/*.sh

EXPOSE 8080

CMD ["node", "server.js"]
```

#### 2. `platform/Dockerfile.worker`
```dockerfile
########################################################################
# Claude Code Worker — runs team sessions in headless mode
########################################################################
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=22
ENV CLAUDE_NONINTERACTIVE=1

# System deps
RUN apt-get update && apt-get install -y \
    curl git jq python3 python3-pip \
    build-essential ca-certificates gnupg \
    && rm -rf /var/lib/apt/lists/*

# Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Go (for controller builds if needed)
RUN curl -fsSL https://go.dev/dl/go1.23.6.linux-amd64.tar.gz | tar -C /usr/local -xzf -
ENV PATH="/usr/local/go/bin:${PATH}"

# GitHub CLI (for PR creation and merge)
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Playwright system dependencies (for E2E tests in pipeline)
RUN npx playwright install-deps chromium 2>/dev/null || true

# Claude Code
RUN npm install -g @anthropic-ai/claude-code

# Working directory
WORKDIR /workspace

# Copy scripts and templates
COPY platform/scripts/ /app/scripts/
COPY templates/ /app/templates/
RUN chmod +x /app/scripts/*.sh

# Default: idle (orchestrator sends work via exec)
CMD ["tail", "-f", "/dev/null"]
```

#### 3. `portal/Dockerfile`
```dockerfile
########################################################################
# Portal — debug UI for viewing cycles, runs, and reports
########################################################################
FROM node:22-slim

WORKDIR /app

# Install backend deps
COPY Backend/package.json Backend/package-lock.json* ./Backend/
RUN cd Backend && npm install

# Install frontend deps
COPY Frontend/package.json Frontend/package-lock.json* ./Frontend/
RUN cd Frontend && npm install

# Install shared deps (if present)
COPY Shared/ ./Shared/

# Copy all source
COPY . .

EXPOSE 3001 5173

CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & cd /app/Frontend && npx vite --host 0.0.0.0 --port 5173 & wait"]
```

#### 4. `platform/.env.example`
```bash
# dev-crew platform configuration
# Copy this to .env and fill in your values

# GitHub — repo the workers will clone and operate on
GITHUB_REPO=https://github.com/Jason-CullumICT/dev-crew
GITHUB_BRANCH=master
GITHUB_TOKEN=

# Project
PROJECT_NAME=dev-crew
WORKSPACE_DIR=/workspace

# Ports
DASHBOARD_PORT=9800
REPORT_PORT=9801
PORTAL_FRONTEND_PORT=4200
PORTAL_BACKEND_PORT=4201

# Port ranges for worker app instances
PORT_RANGE_BACKEND_START=5001
PORT_RANGE_FRONTEND_START=5101
PORT_RANGE_SIZE=50

# Timeouts
CYCLE_TIMEOUT_MS=7200000
PHASE_TIMEOUT_MS=1800000

# Volume retention (hours before auto-cleanup)
VOLUME_RETENTION_HOURS=48
```

#### 5. `platform/docker-compose.yml`
```yaml
services:
  orchestrator:
    build:
      context: ..
      dockerfile: platform/Dockerfile.orchestrator
    ports:
      - "${DASHBOARD_PORT:-9800}:8080"
    environment:
      - GITHUB_REPO=${GITHUB_REPO:-https://github.com/Jason-CullumICT/dev-crew}
      - GITHUB_BRANCH=${GITHUB_BRANCH:-master}
      - GITHUB_TOKEN=${GITHUB_TOKEN:-}
      - PROJECT_NAME=${PROJECT_NAME:-dev-crew}
      - WORKSPACE_DIR=/workspace
      - PORT_RANGE_BACKEND_START=${PORT_RANGE_BACKEND_START:-5001}
      - PORT_RANGE_FRONTEND_START=${PORT_RANGE_FRONTEND_START:-5101}
      - PORT_RANGE_SIZE=${PORT_RANGE_SIZE:-50}
      - CYCLE_TIMEOUT_MS=${CYCLE_TIMEOUT_MS:-7200000}
      - PHASE_TIMEOUT_MS=${PHASE_TIMEOUT_MS:-1800000}
      - VOLUME_RETENTION_HOURS=${VOLUME_RETENTION_HOURS:-48}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - workspace:/workspace
      - claude-config:/root/.claude
      - ~/.claude/.credentials.json:/root/.claude/.credentials.json:ro
    restart: unless-stopped
    networks:
      - dev-crew-net

  worker:
    build:
      context: ..
      dockerfile: platform/Dockerfile.worker
    environment:
      - WORKSPACE_DIR=/workspace
    volumes:
      - workspace:/workspace
      - claude-config:/root/.claude
    deploy:
      replicas: 0
    networks:
      - dev-crew-net

  portal:
    build:
      context: ../portal
    ports:
      - "${PORTAL_FRONTEND_PORT:-4200}:5173"
      - "${PORTAL_BACKEND_PORT:-4201}:3001"
    environment:
      - ORCHESTRATOR_URL=http://orchestrator:8080
      - NODE_ENV=development
    networks:
      - dev-crew-net
    restart: unless-stopped

  dashboard:
    image: nginx:alpine
    ports:
      - "${REPORT_PORT:-9801}:80"
    volumes:
      - workspace:/usr/share/nginx/html/workspace:ro
      - ../platform/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - dev-crew-net
    restart: unless-stopped

volumes:
  workspace:
  claude-config:

networks:
  dev-crew-net:
    driver: bridge
```

**Verification after creating files:**
- Confirm all 5 files exist and are non-empty
- Check Dockerfile syntax is valid (no obvious COPY/FROM errors)
- Verify docker-compose.yml is valid YAML (e.g., `python3 -c "import yaml; yaml.safe_load(open('platform/docker-compose.yml'))"` or similar)

---

## Verification Agents

After backend-fixer-1 completes, run standard verification:
- **verify-reporter**: Confirm all 5 files created, Dockerfile syntax valid, YAML valid
- **security-spotter**: Check for hardcoded secrets, exposed ports, credential handling in .env.example

---

RISK_LEVEL: medium
