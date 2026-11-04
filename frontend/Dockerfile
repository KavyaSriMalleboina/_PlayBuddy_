# Multi-stage Dockerfile for React Vite Frontend

# Stage 1: Build the frontend application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json ./

# Install dependencies (clean install)
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve production assets via Nginx
FROM nginx:alpine

# Copy built static files to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
