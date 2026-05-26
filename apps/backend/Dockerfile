FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install openssl for prisma engine
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm@10.33.0

# Copy workspace configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all packages, modules, and apps
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/backend/ ./apps/backend/

# Install dependencies
RUN pnpm install

# Generate Prisma Client
RUN npx prisma generate

# Expose backend port
EXPOSE 3001

# Wait for DB to be listening, then push schema, seed, and start backend
CMD ["sh", "-c", "until nc -z -v -w30 db 3306; do echo 'Waiting for database...'; sleep 2; done; npx prisma db push && npx prisma db seed && pnpm --filter backend-main start"]
