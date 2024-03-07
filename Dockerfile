# syntax = docker/dockerfile:1.4

ARG NODE_VERSION=20.11.1-bullseye

# build assets & compile TypeScript

FROM --platform=$BUILDPLATFORM node:${NODE_VERSION} AS native-builder

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
	--mount=type=cache,target=/var/lib/apt,sharing=locked \
	rm -f /etc/apt/apt.conf.d/docker-clean \
	; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache \
	&& apt-get update \
	&& apt-get install -yqq --no-install-recommends \
	build-essential

RUN corepack enable

WORKDIR /sharkey

COPY --link ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json", "./"]
COPY --link ["scripts", "./scripts"]
COPY --link ["packages/backend/package.json", "./packages/backend/"]
COPY --link ["packages/frontend/package.json", "./packages/frontend/"]
COPY --link ["packages/sw/package.json", "./packages/sw/"]
COPY --link ["packages/misskey-js/package.json", "./packages/misskey-js/"]
COPY --link ["packages/megalodon/package.json", "./packages/megalodon/"]
COPY --link ["packages/misskey-reversi/package.json", "./packages/misskey-reversi/"]
COPY --link ["packages/misskey-bubble-game/package.json", "./packages/misskey-bubble-game/"]

RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
	pnpm i --frozen-lockfile --aggregate-output

COPY --link . ./

RUN git submodule update --init
RUN pnpm build
RUN mv ./packages/frontend/assets ./sharkey-assets
RUN rm -rf .git/

# build native dependencies for target platform

FROM --platform=$TARGETPLATFORM node:${NODE_VERSION} AS target-builder

RUN apt-get update \
	&& apt-get install -yqq --no-install-recommends \
	build-essential

RUN corepack enable

WORKDIR /sharkey

COPY --link ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json", "./"]
COPY --link ["scripts", "./scripts"]
COPY --link ["packages/backend/package.json", "./packages/backend/"]
COPY --link ["packages/misskey-js/package.json", "./packages/misskey-js/"]
COPY --link ["packages/megalodon/package.json", "./packages/megalodon/"]
COPY --link ["packages/misskey-reversi/package.json", "./packages/misskey-reversi/"]
COPY --link ["packages/misskey-bubble-game/package.json", "./packages/misskey-bubble-game/"]

ARG NODE_ENV=production

RUN node scripts/trim-deps.mjs
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
	pnpm i --aggregate-output

FROM --platform=$TARGETPLATFORM node:${NODE_VERSION}-slim AS runner

ARG UID="991"
ARG GID="991"

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
	ffmpeg tini curl libjemalloc-dev libjemalloc2 \
	&& ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc2.so.2 /usr/local/lib/libjemalloc.so \
	&& corepack enable \
	&& groupadd -g "${GID}" sharkey \
	&& useradd -l -u "${UID}" -g "${GID}" -m -d /sharkey sharkey \
	&& find / -type d -path /sys -prune -o -type d -path /proc -prune -o -type f -perm /u+s -ignore_readdir_race -exec chmod u-s {} \; \
	&& find / -type d -path /sys -prune -o -type d -path /proc -prune -o -type f -perm /g+s -ignore_readdir_race -exec chmod g-s {} \; \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists

USER sharkey
WORKDIR /sharkey

COPY --chown=sharkey:sharkey --from=target-builder /sharkey/node_modules ./node_modules
COPY --chown=sharkey:sharkey --from=target-builder /sharkey/packages/backend/node_modules ./packages/backend/node_modules
COPY --chown=sharkey:sharkey --from=target-builder /sharkey/packages/misskey-js/node_modules ./packages/misskey-js/node_modules
COPY --chown=sharkey:sharkey --from=target-builder /sharkey/packages/megalodon/node_modules ./packages/megalodon/node_modules
COPY --chown=sharkey:sharkey --from=target-builder /sharkey/packages/misskey-reversi/node_modules ./packages/misskey-reversi/node_modules
COPY --chown=sharkey:sharkey --from=target-builder /sharkey/packages/misskey-bubble-game/node_modules ./packages/misskey-bubble-game/node_modules
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/built ./built
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/misskey-js/built ./packages/misskey-js/built
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/megalodon/lib ./packages/megalodon/lib
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/misskey-reversi/built ./packages/misskey-reversi/built
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/misskey-bubble-game/built ./packages/misskey-bubble-game/built
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/backend/built ./packages/backend/built
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/fluent-emojis /sharkey/fluent-emojis
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/tossface-emojis /sharkey/tossface-emojis
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/package.json ./package.json
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/backend/package.json ./packages/backend/package.json
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/backend/check_connect.js ./packages/backend/check_connect.js
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/backend/ormconfig.js ./packages/backend/ormconfig.js
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/backend/migration ./packages/backend/migration
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/backend/assets ./packages/backend/assets
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/sharkey-assets ./packages/frontend/assets
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/megalodon/package.json ./packages/megalodon/package.json
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/misskey-js/package.json ./packages/misskey-js/package.json
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/misskey-reversi/package.json ./packages/misskey-reversi/package.json
COPY --chown=sharkey:sharkey --from=native-builder /sharkey/packages/misskey-bubble-game/package.json ./packages/misskey-bubble-game/package.json


ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so
ENV NODE_ENV=production
HEALTHCHECK --interval=5s --retries=20 CMD ["/bin/bash", "/sharkey/healthcheck.sh"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "run", "migrateandstart"]
