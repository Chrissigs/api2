FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Expose ports for NRL Server (3000) and Bank Node (3001)
EXPOSE 3000 3001

# Default command (can be overridden in docker-compose)
ARG JURISDICTION=CAYMAN
# Digital Border: Enforce data processing location
ENV JURISDICTION=${JURISDICTION}
LABEL compliance.jurisdiction=${JURISDICTION}

# Security: Run as non-root user
USER node

# Healthcheck to verify HSM connectivity and server status
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/v1/passport/verify || exit 1

CMD ["npm", "start"]
