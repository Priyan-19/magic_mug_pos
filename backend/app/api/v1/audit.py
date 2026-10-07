from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse, AuditLogListResponse
from app.services.auth_service import require_role

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("/logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None, description="Filter by action code"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    filters = []
    if action:
        filters.append(AuditLog.action == action)
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)

    base_filter = and_(*filters) if filters else True

    # Count
    count_stmt = select(func.count(AuditLog.id)).where(base_filter)
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0

    # Query
    offset = (page - 1) * limit
    stmt = (
        select(AuditLog, User.username.label("username"))
        .outerjoin(User, User.id == AuditLog.user_id)
        .where(base_filter)
        .order_by(desc(AuditLog.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for log, username in rows:
        resp = AuditLogResponse.model_validate(log)
        resp.username = username or "System"
        items.append(resp)

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit
    )
