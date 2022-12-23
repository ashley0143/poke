FROM quay.io/almalinuxorg/9-base AS builder

# Install required build dependencies
# RUN dnf module --assumeyes enable nodejs
RUN dnf install --assumeyes --nodocs nodejs ca-certificates jq make gcc g++

# Install latest npm
RUN npm install -g \
    npm@$(curl "https://release-monitoring.org/api/v2/versions/?project_id=190206" | jq --raw-output '.stable_versions[0]')

# Install necessary runtime dependencies
RUN dnf install -y \
    --installroot /rpms \
    --releasever=9 \
    --setopt=install_weak_deps=false \
    --nodocs \
    nodejs ca-certificates

RUN dnf clean all \
    --installroot /rpms

# Build!
WORKDIR /app
COPY package.json /app
COPY p /app/p
RUN npm install --frozen-lockile

# Create final image
FROM quay.io/almalinuxorg/9-micro

# Grab npm
COPY --from=builder /rpms .

# Grab site
COPY --from=builder /app /app

WORKDIR /app

ENV NODE_ENV production
EXPOSE 3000/tcp
ENTRYPOINT ["node", "p/server.js"]
