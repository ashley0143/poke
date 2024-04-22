# docker build -t pproxy .
# docker run -p 6003:6003 -v ./whitelist.json:/pproxy/whitelist.json:ro pproxy

# Base
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache git build-base python3

# Set Work Directory
WORKDIR /pproxy

# Install dependencies
# Honestly less effort this way
RUN yarn add express undici

# Copy files
COPY server.js .

# Entrypoint
CMD [ "node", "server.js" ]
