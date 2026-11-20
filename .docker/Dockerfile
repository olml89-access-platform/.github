ARG NODE_VERSION

FROM node:${NODE_VERSION}-bookworm-slim

ARG ACTIONLINT_VERSION
ARG TARGETARCH

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        bash && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL \
    "https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/actionlint_${ACTIONLINT_VERSION}_linux_${TARGETARCH}.tar.gz" \
    -o /tmp/actionlint.tar.gz && \
    tar -xzf /tmp/actionlint.tar.gz -C /tmp actionlint && \
    install -m 0755 /tmp/actionlint /usr/local/bin/actionlint && \
    rm -f /tmp/actionlint.tar.gz /tmp/actionlint

WORKDIR /workspace

RUN mkdir -p /workspace/node_modules && \
    chown node:node /workspace/node_modules

ARG USER_ID
ARG GROUP_ID

RUN groupmod --gid "${GROUP_ID}" node && \
    usermod --uid "${USER_ID}" --gid "${GROUP_ID}" node

USER node
