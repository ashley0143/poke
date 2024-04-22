## To build the image, run:
## docker build -t poketube .

## To run the image, run:
## docker run -p 6003:6003 -v ./config.json:/poketube/config.json:ro poketube
## but preferably, use the docker-compose.yml file

# Base
FROM node:16-alpine

# Install dependencies
RUN apk add --no-cache git build-base python3

# Set Work Directory
WORKDIR /poketube
COPY . /poketube

# Expose Ports
EXPOSE 6003

# Install Dependencies
RUN npm install

# Start the app
CMD ["npm", "start"]
