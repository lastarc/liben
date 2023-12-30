FROM node:18-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN apk add --no-cache ffmpeg yt-dlp

COPY . /app
WORKDIR /app

RUN pnpm install

CMD ["pnpm", "start"]
