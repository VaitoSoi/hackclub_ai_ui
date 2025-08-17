# Simple Docker Dashboard Backend

## I. Introduction

This is a simple FastAPI app, use JWT for token creation, SQLite (default) as database, SQLModel (aiosqlite) for interacting with database and aiohttp to interact with model.

## II. Conversation structure

You can image the conversation structure as a tree, where each node is a message from user or from model. It work like how ChatGPT conversations work, when you edit an message, a new conversation is create yet keep the old one.

```
System prompt
|
Assistant
|    \
User  U <- Users edit a message, create a new branch
|     |
A     A <- Model continue as a new conversation
|     | \
U     U  U <- Create a new branch when users edit their message
|     |
A     A
|
U
|
...
```


## III. Endpoints

### 1. AI


```
System prompt
|
Assistant <- GET /ai/children Get all direct children of this message
|    \     |
User  U <--+ Expect to return these messages ID
|     |
A     A
|     |
U     U <- GET /ai/conversation Get all message from the newest branch
|
A <- /ai/conversation?message Get all message from branch that contain the message in query
|
U <--+
|    |
... <- POST /ai/prompt Send message message base on previous message ID, allowing create new branch
```

### 2. User

* I'm too lazy to list there 😭
* Please visit the endpoint `/docs` for more information ;-;

## IV. Environments

|Name|Default value|Accept value|Note|
|----|-------------|------------|----|
|`USE_HASH`|`true`|`true` or `false`|Please keep this value unchanged if you do not want to mess up the hash function. If you want to change this value, you must delete the database.|
|`SIGNATURE`|Random string (reset every time you restart)|Any string|Set this value if you don't want to create a new token each time you restart.|
|`DB_URL`|`sqlite+aiosqlite:///data/database.db`|A SQL DB connection string|Any kind of SQL DB that SQLAlchemy supports|
|`UVICORN_PORT`|`8000`|A number from 0-65535|Only used when you run this app with uvicorn|
|`UVICORN_HOST`|`127.0.0.1`|An valid IP|Only used when you run this app with uvicorn|

## V. How to run

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
