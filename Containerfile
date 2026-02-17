# use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production && bun add typescript

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# build the Next.js application
ENV NODE_ENV=production
# We skip linting during build to speed up the containerization if there are no tests defined
# RUN bun run lint 
RUN bun run build

# copy production dependencies and built assets into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=build /usr/src/app/.next .next
COPY --from=build /usr/src/app/public public
COPY --from=build /usr/src/app/package.json .
COPY --from=build /usr/src/app/next.config.ts .
COPY --from=build /usr/src/app/scripts scripts
COPY --from=build /usr/src/app/lib lib

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "start:prod" ]
