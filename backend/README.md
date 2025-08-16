# Simple Docker Dashboard Backend

## I. Introduction

This is a simple FastAPI app, use JWT for token creation, SQLite (default) as database, SQLModel (aiosqlite) for interacting with database and aiohttp to interact with model.

## II. Endpoints

* I'm too lazy to list there 😭
* Please visit the endpoint `/docs` for more information ;-;

## III. Environments

|Name|Default value|Accept value|Note|
|----|-------------|------------|----|
|`USE_HASH`|`true`|`true` or `false`|Please keep this value unchanged if you do not want to mess up the hash function. If you want to change this value, you must delete the database.|
|`SIGNATURE`|Random string (reset every time you restart)|Any string|Set this value if you don't want to create a new token each time you restart.|
|`DB_URL`|`sqlite+aiosqlite:///data/database.db`|A SQL DB connection string|Any kind of SQL DB that SQLAlchemy supports|
|`UVICORN_PORT`|`8000`|A number from 0-65535|Only used when you run this app with uvicorn|
|`UVICORN_HOST`|`127.0.0.1`|An valid IP|Only used when you run this app with uvicorn|

## IV. How to run

### 1. With FastAPI CLI

To start a development server:

```bash
fastapi dev main.py
```

To run for production:

```bash
fastapi run main.py
```

### 2. With uvicorn

To start a development server:

```bash
uvicorn main:app --reload
```

To run for production:

```bash
uvicorn main:app
```
