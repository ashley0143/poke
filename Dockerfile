## To build the image, run:
## docker build -t poketube .

## To run the image, run:
## docker run -d  -p 6003:6003 poketube

# Base (Debian)
FROM debian

# Set Work Directory
WORKDIR /poketube
COPY . /poketube

# Expose Ports
EXPOSE 6003

# Install Requirements
RUN apt-get update && apt-get -y install \
    libcurl4-openssl-dev make g++ ca-certificates curl gnupg

# Install NodeJS v18
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_16.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

RUN apt-get update
RUN apt-get -y install nodejs npm

# Install Packages
RUN npm install

# Run
CMD npm start