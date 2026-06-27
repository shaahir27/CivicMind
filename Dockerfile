FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy all source code (this ensures all workspace package.json files are present)
COPY . .

# Install dependencies
RUN npm ci

# Build the shared library and the backend
RUN npm run build -w packages/shared
RUN npm run build -w packages/backend

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Start the backend
CMD ["npm", "start", "-w", "packages/backend"]
