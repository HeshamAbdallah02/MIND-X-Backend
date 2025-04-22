FROM node:23-alpine

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy application code
COPY --chown=appuser:appgroup . .

# Set environment variables
ENV PORT=8080 \
    NODE_ENV=production \
    HOME=/app

# Create and set permissions for tmp directory
RUN mkdir -p /app/tmp && \
    chown -R appuser:appgroup /app/tmp

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Start command
CMD ["node", "index.mjs"]