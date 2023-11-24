## To build the image, run:
## docker build -t poketube .

## To run the image, run:
## docker run -d  -p 6003:6003 poketube

# Base (Alpine Linux)
FROM alpine

# Set Work Directory
WORKDIR /poketube
COPY . /poketube

# Expose Default Ports
EXPOSE 6003

# Install Requirements
RUN apk add nodejs npm make g++ ca-certificates curl gnupg python3

# Install Packages
RUN npm install

# Run
CMD npm start