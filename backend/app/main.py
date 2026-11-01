import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import api_v1_router

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure database schema is ready
    await init_db()
    yield
    # Shutdown logic if any


# Gate interactive documentation behind DEBUG (Issue 11 fix)
app = FastAPI(
    title=settings.APP_NAME,
    description="Magic Mug - Production-Ready Cafe POS & Sales Management API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Compression Middleware (reduces catalog & bills payloads by 40-70%)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS Middleware (Issue 4 fix: prevent allow_credentials with wildcard origin)
is_wildcard_cors = "*" in settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=not is_wildcard_cors,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request performance tracing and Server-Timing correlation middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(process_time_ms)
    response.headers["Server-Timing"] = f"app;dur={process_time_ms}"
    return response


# Standardized error handlers adhering to application_flow.md Section 10
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "details": None
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        errors.append({"field": field, "message": err.get("msg")})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation failed for request data",
                "details": errors
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # Log full traceback internally to server logs (Issue 7 fix)
    logger.exception(f"Unhandled server exception: {exc}")
    
    # In production, never leak internal error message strings/tracebacks to clients
    is_prod = settings.ENV.lower() in ("production", "prod")
    client_message = (
        str(exc) if (settings.DEBUG and not is_prod) 
        else "An unexpected error occurred. Please contact the administrator."
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": client_message,
                "details": None
            }
        },
    )


# Health check
@app.get("/", tags=["Health"])
async def root():
    response = {
        "status": "online",
        "app": settings.APP_NAME,
        "version": "1.0.0"
    }
    if settings.DEBUG:
        response["docs"] = "/docs"
    return response


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}


# Mount API v1
app.include_router(api_v1_router)
