FROM node:18
WORKDIR /app
COPY package.json /app/
COPY p /app/p
RUN npm install --frozen-lockfile
ENV NODE_ENV production
CMD ["node", "p/server.js"]
