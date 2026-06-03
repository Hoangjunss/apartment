FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install openssl for prisma engine
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm@10.33.0

# Copy workspace configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for backend & shared workspaces
COPY packages/prisma/package.json ./packages/prisma/
COPY apps/backend/package.json ./apps/backend/
COPY modules/audit-log/backend/package.json ./modules/audit-log/backend/
COPY modules/auth/backend/package.json ./modules/auth/backend/
COPY modules/building/backend/package.json ./modules/building/backend/
COPY modules/contract/backend/package.json ./modules/contract/backend/
COPY modules/finance/backend/package.json ./modules/finance/backend/
COPY modules/notifications/backend/package.json ./modules/notifications/backend/
COPY modules/public/backend/package.json ./modules/public/backend/
COPY modules/service-requests/backend/package.json ./modules/service-requests/backend/
COPY modules/tenant/backend/package.json ./modules/tenant/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter backend-main...

# Copy source code
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/backend/ ./apps/backend/

# Generate Prisma Client
RUN npx prisma generate

# Expose backend port
EXPOSE 3001

# Wait for DB to be listening, then push schema, seed, and start backend
CMD ["sh", "-c", "until nc -z -v -w30 db 3306; do echo 'Waiting for database...'; sleep 2; done; npx prisma db push && npx prisma db seed && pnpm --filter backend-main start"]
