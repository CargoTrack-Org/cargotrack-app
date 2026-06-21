# Stage 1: Build React app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# VITE_API_BASE_URL is baked into the JS bundle at build time.
# /api routes to nginx, which proxies based on path.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config as a template
# CORE_SERVICE_URL and DOCUMENT_SERVICE_URL are substituted at startup
COPY nginx.conf /etc/nginx/templates/nginx.conf.template

EXPOSE 80

# At container start:
# 1. envsubst substitutes $CORE_SERVICE_URL and $DOCUMENT_SERVICE_URL
#    in the nginx config template (nginx's own variables are preserved)
# 2. nginx starts serving
CMD ["sh", "-c", \
  "envsubst '$CORE_SERVICE_URL $DOCUMENT_SERVICE_URL' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf && \
   nginx -g 'daemon off;'"]
