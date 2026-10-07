from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.products import router as products_router
from app.api.v1.bills import router as bills_router
from app.api.v1.expenses import router as expenses_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.audit import router as audit_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(categories_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(bills_router)
api_v1_router.include_router(expenses_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(audit_router)
