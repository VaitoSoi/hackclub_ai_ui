FROM oven/bun:latest
EXPOSE 8080

WORKDIR /app

COPY ./package.json /app/package.json
RUN bun install

COPY . /app/
CMD ["bun", "start"]
