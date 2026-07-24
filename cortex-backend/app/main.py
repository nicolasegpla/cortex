from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import (
    admin_users,
    animal_feed_producers,
    auth,
    breweries,
    coffee_farms,
    entities,
    health,
    n8n_chat,
    support,
    wine_producers,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(title='CORTEX API', lifespan=lifespan)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    application.include_router(health.router)
    application.include_router(auth.router)
    application.include_router(admin_users.router)
    application.include_router(breweries.router)
    application.include_router(coffee_farms.router)
    application.include_router(animal_feed_producers.router)
    application.include_router(wine_producers.router)
    application.include_router(entities.router)
    application.include_router(n8n_chat.router)
    application.include_router(support.router)

    return application


app = create_app()
