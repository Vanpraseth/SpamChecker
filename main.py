import os
import sys
import time

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


_here = os.path.dirname(__file__)
_backend_path = os.path.join(_here, "backend")
if _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)

from api.routes import router
from core.config import (
    ALLOW_ORIGINS,
    API_HOST,
    API_PORT,
    API_RELOAD,
    APP_NAME,
    APP_VERSION,
)
from utils.model_registry import available_models


app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    print(f"{request.method} {request.url.path} - {duration:.3f}s")
    return response


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": "An error occurred"},
    )


@app.get("/")
def root():
    return {"name": APP_NAME, "version": APP_VERSION, "docs": "/docs"}


@app.get("/health")
def health_alias():
    return {"status": "ok", "models": available_models()}


if __name__ == "__main__":
    reload_dirs = [
        os.path.join(_here, "backend"),
        os.path.join(_here, "models"),
    ]
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=API_RELOAD,
        reload_dirs=reload_dirs if API_RELOAD else None,
        log_level="info",
    )
