from collections.abc import Generator
from contextlib import contextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, entities, health


@contextmanager
def lifespan(_: FastAPI) -> Generator[None, None, None]:
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
    application.include_router(entities.router)

    return application


app = create_app()
