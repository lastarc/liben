FROM oven/bun:1-alpine AS base

WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
RUN bun run lint

FROM base AS release

RUN echo 'https://dl-cdn.alpinelinux.org/alpine/edge/main' > /etc/apk/repositories
RUN echo 'https://dl-cdn.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories
RUN apk update && apk upgrade
RUN apk add --no-cache yt-dlp

RUN adduser -D liben
USER liben

WORKDIR /app

COPY --from=install /temp/prod/node_modules node_modules
COPY --chown=liben:liben . .

CMD [ "bun", "run", "start" ]
