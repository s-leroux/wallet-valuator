#
#
#
FROM debian:bullseye-slim

ARG NODE_ARCH=linux-x64
ARG NODE_VERSION=24.1.0

ARG OP_ARCH=amd64


# Core utilities
ARG DEBIAN_FRONTEND="noninteractive"
RUN apt-get update
RUN apt-get install -y --no-install-recommends \
    ca-certificates \
    binutils git make \
    procps \
    iproute2 wget curl \
    less \
  && apt-get clean

# ViM editor
RUN apt-get install -y vim && apt-get clean
ENV EDITOR=/usr/bin/vim

# Node.js
RUN apt-get install -y xz-utils && apt-get clean
RUN cd /opt && \
    wget -O- --progress=dot:mega https://nodejs.org/dist/v"${NODE_VERSION}"/node-v"${NODE_VERSION}-${NODE_ARCH}".tar.xz | tar xJf - && \
    ln -sT "node-v${NODE_VERSION}-${NODE_ARCH}" node
ENV PATH="/opt/node/bin:${PATH}"
RUN npm config -g set update-notifier false

# CLI AI tools
RUN npm install -g @anthropic-ai/claude-code && \
    npm install -g @google/gemini-cli

# Set the workdir and user settings
RUN groupadd -g 1000 app && useradd -M -u 1000 -g 1000 app
WORKDIR /app
ENV PATH="/app/node_modules/.bin:${PATH}"
ENV HOME=/app
USER 1000:1000
ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["npm", "test"]
