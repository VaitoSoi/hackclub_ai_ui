from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from lib.api import close, init as api_init
from lib.db import init as db_init
from routes.ai import router as ai_router
from routes.user import router as user_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_init()
    await api_init()
    yield
    await close()

app = FastAPI(
    title="Hackclub AI Wrapper",
    description="A simple middleware between you and Hackclub AI endpoint. Use tree-graph design to manage messages (like ChatGPT conversation).",
    license_info={"name": "MIT"},
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(ai_router)
app.include_router(user_router)

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)