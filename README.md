# hackclub_ai_ui
An UI for [ai.hackclub.com](https://ai.hackclub.com)

## I. Introduction

This is a simple UI for Hackclub AI.

## II. Setup

1. Pull [this repo](https://github.com/vaitosoi/hackclub_ai_ui/)
2. Create file `docker.env` with follow content:

    ```
    SIGNATURE=<A random string>
    USE_HASH=false
    UVICORN_HOST=0.0.0.0

    UI_BACKEND=http://localhost:8000
    ```
3. Run `docker compose up`
4. Go to [the web](http://localhost:8080) and use it :D

## III. Components

|Services|Language|Framework|Runtime|Port (default)|
|-|-|-|-|-|
|Backend|Python|[FastAPI](https://fastapi.tiangolo.com/)|[Python](https://www.python.org/)|8000|
|Frontend|TypeScript|[React](https://react.dev/)|[Bun](https://bun.sh)|8080|

## IV. Notes:

Nothing...
