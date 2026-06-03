FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.33.0

# Copy workspace configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for frontend & shared workspaces
COPY apps/frontend/package.json ./apps/frontend/
COPY modules/auth/frontend/package.json ./modules/auth/frontend/
COPY modules/building/frontend/package.json ./modules/building/frontend/
COPY modules/contract/frontend/package.json ./modules/contract/frontend/
COPY modules/finance/frontend/package.json ./modules/finance/frontend/
COPY modules/tenant/frontend/package.json ./modules/tenant/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter frontend-main...

# Copy source code
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/frontend/ ./apps/frontend/

# Expose frontend port
EXPOSE 5173

# Start frontend dev server
CMD ["pnpm", "--filter", "frontend-main", "dev", "--host", "0.0.0.0"]
