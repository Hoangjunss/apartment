FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.33.0

# Copy workspace configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all packages, modules, and apps
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/frontend/ ./apps/frontend/

# Install dependencies
RUN pnpm install

# Expose frontend port
EXPOSE 5173

# Start frontend dev server
CMD ["pnpm", "--filter", "frontend-main", "dev", "--host", "0.0.0.0"]
