FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable \
    && corepack prepare pnpm@10.10.0 --activate \
    && pnpm install --frozen-lockfile

EXPOSE 5173

CMD ["pnpm", "run", "dev"]
