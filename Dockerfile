FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the shared library and the backend
RUN npm run build -w packages/shared
RUN npm run build -w packages/backend

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Start the backend
CMD ["npm", "start", "-w", "packages/backend"]
